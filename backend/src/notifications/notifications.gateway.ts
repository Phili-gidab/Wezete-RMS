import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';
import { Role } from '@prisma/client';

/** Maps Prisma roles to the KDS room they auto-join on connect. */
const ROLE_TO_ROOM: Partial<Record<Role, string>> = {
  CHEF: 'kitchen_station',
  BARISTA: 'bar_station',
  WAITER: 'waiter_station',
  ADMIN: 'admin',
  SUPER_ADMIN: 'admin',
  INVENTORY_MANAGER: 'inventory',
};

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Connection lifecycle                                               */
  /* ------------------------------------------------------------------ */

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticateClient(client);

      // Attach user data so other handlers can access it
      client.data.user = user;

      // Auto-join rooms based on role
      const room = ROLE_TO_ROOM[user.roleName];
      if (room) {
        client.join(room);
      }

      this.logger.log(
        `Client connected: ${user.email} (${user.roleName}) → room=${room ?? 'none'}`,
      );
    } catch {
      this.logger.warn(`Unauthenticated socket rejected`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const email = client.data?.user?.email ?? 'unknown';
    this.logger.log(`Client disconnected: ${email}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Client-initiated events                                            */
  /* ------------------------------------------------------------------ */

  /** Allow a client to join extra rooms (e.g. admin also watches kitchen). */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    const allowed = [
      'kitchen_station',
      'bar_station',
      'waiter_station',
      'admin',
      'inventory',
    ];
    if (!allowed.includes(room)) {
      return { event: 'error', data: { message: `Unknown room: ${room}` } };
    }
    client.join(room);
    this.logger.log(`${client.data.user.email} joined room: ${room}`);
    return { event: 'joinedRoom', data: { room } };
  }

  /** Allow a client to leave a room. */
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.leave(room);
    this.logger.log(`${client.data.user.email} left room: ${room}`);
    return { event: 'leftRoom', data: { room } };
  }

  /* ------------------------------------------------------------------ */
  /*  Server-side emit helpers (called by NotificationsService)          */
  /* ------------------------------------------------------------------ */

  emitToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                     */
  /* ------------------------------------------------------------------ */

  private async authenticateClient(client: Socket) {
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const payload = this.jwtService.verify(token);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    return {
      id: user.id,
      email: user.email,
      role: ROLE_LEVEL[user.role],
      roleName: user.role,
    };
  }
}
