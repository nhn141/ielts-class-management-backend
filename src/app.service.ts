import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Class Management API is online!';
  }

  async checkHealth() {
    const start = Date.now();
    let dbStatus = 'disconnected';
    let dbLatency = 0;

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
        dbLatency = Date.now() - start;
      } else {
        dbStatus = 'initializing';
      }
    } catch (error: any) {
      dbStatus = `error: ${error.message || 'Database query failed'}`;
      this.logger.error(`Database health check failed: ${error.message}`, error.stack);
    }

    const isHealthy = dbStatus === 'connected';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      message: isHealthy ? 'API and Database are healthy' : 'Database connection issue detected',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Internal keep-alive cron job: chạy mỗi 10 phút để giữ kết nối Supabase luôn ấm
   * khi backend đang hoạt động.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleInternalDbKeepAlive() {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        this.logger.debug('Internal DB Keep-alive ping executed successfully');
      }
    } catch (error: any) {
      this.logger.warn(`Internal DB Keep-alive ping failed: ${error.message}`);
    }
  }
}

