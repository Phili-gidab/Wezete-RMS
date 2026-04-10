import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(ROLE_LEVEL.ADMIN)
  send(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.send(dto);
  }
}
