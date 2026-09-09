import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get list of notifications for current logged-in user
   */
  @Get()
  async getMyNotifications(
    @CurrentUser() currentUser: User,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getUserNotifications(
      currentUser.id,
      limit ? Number(limit) : 30,
    );
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() currentUser: User) {
    const unreadCount = await this.notificationsService.countUnread(currentUser.id);
    return { unreadCount };
  }

  /**
   * Mark all notifications as read
   */
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() currentUser: User) {
    return this.notificationsService.markAllAsRead(currentUser.id);
  }

  /**
   * Mark a specific notification as read
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.notificationsService.markAsRead(id, currentUser.id);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.notificationsService.deleteNotification(id, currentUser.id);
  }
}
