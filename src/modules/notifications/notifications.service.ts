import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

export interface ICreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Create a notification in DB and emit realtime event to the user
   */
  async createAndSend(dto: ICreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type || 'SUPPORT_REQUEST',
      link: dto.link || '/support-sessions',
      metadata: dto.metadata || null,
      isRead: false,
    });

    const saved = await this.notificationRepository.save(notification);

    const unreadCount = await this.countUnread(dto.userId);

    // Emit Realtime event via WebSockets
    try {
      this.notificationsGateway.sendToUser(dto.userId, 'notification_received', {
        notification: saved,
        unreadCount,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to emit notification_received: ${err.message}`);
    }

    return saved;
  }

  /**
   * Count unread notifications for a user
   */
  async countUnread(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Get user's notifications list and current unread count
   */
  async getUserNotifications(userId: string, limit = 30) {
    const [data, unreadCount] = await Promise.all([
      this.notificationRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      this.countUnread(userId),
    ]);

    return {
      data,
      unreadCount,
    };
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Không tìm thấy thông báo`);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationRepository.save(notification);
    }

    const unreadCount = await this.countUnread(userId);
    return {
      success: true,
      unreadCount,
      notification,
    };
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    return {
      success: true,
      unreadCount: 0,
    };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string) {
    await this.notificationRepository.delete({ id, userId });
    const unreadCount = await this.countUnread(userId);
    return {
      success: true,
      unreadCount,
    };
  }
}
