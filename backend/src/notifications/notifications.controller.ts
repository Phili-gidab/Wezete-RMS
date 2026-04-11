import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(ROLE_LEVEL.ADMIN)
  send(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Get()
  getNotifications(
    @CurrentUser() user: { id: string; roleName: string },
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.getNotifications(user.roleName, user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: { id: string; roleName: string }) {
    return this.notificationsService.getUnreadCount(user.roleName, user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: { id: string; roleName: string }) {
    return this.notificationsService.markAllAsRead(user.roleName, user.id);
  }
}
