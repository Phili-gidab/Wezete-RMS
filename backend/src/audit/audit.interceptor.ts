import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    if (!AUDITED_METHODS.has(method)) {
      return next.handle();
    }

    const userId: string | undefined = req.user?.id;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const entity = controller.replace(/Controller$/, '');
    const entityId: string = req.params?.id ?? '';
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? '';

    return next.handle().pipe(
      tap(() => {
        this.auditService
          .log({
            action: `${method} ${entity}.${handler}`,
            entity,
            entityId,
            userId: userId ?? 'anonymous',
            delta: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
            ipAddress: ip,
          })
          .catch(() => {
            // Audit logging should never break the request
          });
      }),
    );
  }
}
