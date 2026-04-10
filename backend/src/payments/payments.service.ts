import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';

const CHAPA_BASE_URL = 'https://api.chapa.co/v1';
const MAX_RETRIES = 3;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly chapaSecretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    this.chapaSecretKey = this.config.get<string>('CHAPA_SECRET_KEY', '');
  }

  // ────────── Initialize Payment ──────────

  async create(dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true, user: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    if (order.payment) {
      throw new ConflictException(
        `Payment already exists for order ${dto.orderId}`,
      );
    }

    if (order.status !== OrderStatus.PAYMENT) {
      throw new BadRequestException(
        `Order is not in PAYMENT status (current: ${order.status})`,
      );
    }

    // ── CASH: instant success ──
    if (dto.method === PaymentMethod.CASH) {
      return this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            amount: order.total,
            method: PaymentMethod.CASH,
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(),
            orderId: order.id,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.COMPLETE },
        });

        // Notify after cash payment
        this.notifications
          .notifyPaymentReceived(order.orderNumber, Number(order.total), 'CASH')
          .catch(() => {});

        return payment;
      });
    }

    // ── CHAPA: initialize via Chapa API ──
    const txRef = this.generateTxRef(order.id);

    const payment = await this.prisma.payment.create({
      data: {
        amount: order.total,
        method: PaymentMethod.CHAPA,
        status: PaymentStatus.PENDING,
        txRef,
        orderId: order.id,
      },
    });

    try {
      const chapaResponse = await this.chapaRequest('POST', '/transaction/initialize', {
        amount: Number(order.total),
        currency: 'ETB',
        tx_ref: txRef,
        callback_url: this.config.get<string>('CHAPA_WEBHOOK_URL', ''),
        return_url: this.config.get<string>('CHAPA_RETURN_URL', ''),
        first_name: order.user.firstName,
        last_name: order.user.lastName,
        email: order.user.email,
        ...(order.user.phone && { phone_number: order.user.phone }),
      });

      return {
        payment,
        checkoutUrl: chapaResponse.data?.checkout_url,
      };
    } catch (error) {
      // Mark payment as failed if Chapa initialization fails
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      this.logger.error(
        `Chapa initialization failed for tx_ref=${txRef}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to initialize Chapa payment. Please try again.',
      );
    }
  }

  // ────────── Webhook Handler ──────────

  async handleWebhook(payload: any, signature: string) {
    // Step 1: HMAC-SHA256 signature verification
    this.verifyWebhookSignature(payload, signature);

    const txRef = payload.tx_ref;
    if (!txRef) {
      this.logger.warn('Webhook received without tx_ref');
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { txRef },
    });

    if (!payment) {
      this.logger.warn(`Webhook for unknown tx_ref: ${txRef}`);
      return;
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.log(`Payment ${txRef} already marked SUCCESS, skipping`);
      return;
    }

    // Step 2: Double-verification — call Chapa verify endpoint
    const verified = await this.verifyWithChapa(txRef);

    if (!verified.success) {
      this.logger.warn(
        `Chapa verification failed for ${txRef}: ${verified.reason}`,
      );

      if (payment.status === PaymentStatus.PENDING) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }
      return;
    }

    // Step 3: Update DB atomically
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          chapaRef: verified.chapaRef,
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.COMPLETE },
      });
    });

    this.logger.log(`Payment ${txRef} verified and marked SUCCESS`);

    // Notify on successful Chapa payment
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
    });
    if (order) {
      this.notifications
        .notifyPaymentReceived(order.orderNumber, Number(payment.amount), 'CHAPA')
        .catch(() => {});
    }
  }

  // ────────── Manual Verify (for polling / retries from client) ──────────

  async verifyChapaPayment(txRef: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { txRef },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with txRef "${txRef}" not found`);
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment cannot be verified (current status: ${payment.status})`,
      );
    }

    const verified = await this.verifyWithChapa(txRef);

    if (!verified.success) {
      throw new BadRequestException(
        `Chapa verification failed: ${verified.reason}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          chapaRef: verified.chapaRef,
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.COMPLETE },
      });

      return updated;
    });
  }

  // ────────── Refund ──────────

  async refund(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        `Cannot refund payment with status ${payment.status}`,
      );
    }

    // For Chapa payments, call the Chapa refund/transfer API
    if (payment.method === PaymentMethod.CHAPA && payment.chapaRef) {
      try {
        await this.chapaRequest('POST', '/refund', {
          reference: payment.chapaRef,
          amount: Number(payment.amount),
          reason: 'Customer refund',
        });
      } catch (err) {
        this.logger.error(`Chapa refund failed for ${payment.chapaRef}: ${err.message}`);
        throw new BadRequestException('Chapa refund failed. Please retry or process manually.');
      }
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  // ────────── Find By Order ──────────

  async findByOrder(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException(`No payment found for order ${orderId}`);
    }

    return payment;
  }

  // ═══════════════ Private Helpers ═══════════════

  /**
   * Generate a unique tx_ref by HMAC-hashing the orderId + timestamp.
   */
  private generateTxRef(orderId: string): string {
    const raw = `${orderId}-${Date.now()}`;
    const hash = crypto
      .createHmac('sha256', this.chapaSecretKey)
      .update(raw)
      .digest('hex')
      .slice(0, 16);
    return `wz-${hash}`;
  }

  /**
   * Verify the Chapa webhook HMAC-SHA256 signature.
   * Chapa signs the raw JSON body with your secret key.
   */
  private verifyWebhookSignature(payload: any, signature: string): void {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.chapaSecretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (!isValid) {
      this.logger.warn('Webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Double-verify by calling Chapa's GET /transaction/verify/{tx_ref}.
   */
  private async verifyWithChapa(
    txRef: string,
  ): Promise<{ success: boolean; chapaRef?: string; reason?: string }> {
    try {
      const response = await this.chapaRequest(
        'GET',
        `/transaction/verify/${txRef}`,
      );

      if (
        response.status === 'success' &&
        response.data?.status === 'success'
      ) {
        return {
          success: true,
          chapaRef: response.data.reference,
        };
      }

      return {
        success: false,
        reason: response.message || 'Verification returned non-success status',
      };
    } catch (error) {
      return {
        success: false,
        reason: `Verify API error: ${error.message}`,
      };
    }
  }

  /**
   * Make an HTTP request to Chapa API with exponential back-off retry.
   */
  private async chapaRequest(
    method: 'GET' | 'POST',
    path: string,
    data?: Record<string, any>,
  ): Promise<any> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios({
          method,
          url: `${CHAPA_BASE_URL}${path}`,
          headers: {
            Authorization: `Bearer ${this.chapaSecretKey}`,
            'Content-Type': 'application/json',
          },
          data: method === 'POST' ? data : undefined,
          timeout: 15_000,
        });

        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        // Don't retry client errors (4xx) — only timeouts and server errors
        if (status && status >= 400 && status < 500) {
          const message =
            (axiosError.response?.data as any)?.message ||
            axiosError.message;
          throw new BadRequestException(`Chapa API error: ${message}`);
        }

        if (attempt < MAX_RETRIES) {
          const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          this.logger.warn(
            `Chapa request ${method} ${path} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delayMs}ms`,
          );
          await this.sleep(delayMs);
        } else {
          this.logger.error(
            `Chapa request ${method} ${path} failed after ${MAX_RETRIES + 1} attempts`,
          );
          throw error;
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
