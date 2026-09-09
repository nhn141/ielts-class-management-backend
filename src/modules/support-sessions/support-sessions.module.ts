import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportSession } from './entities/support-session.entity';
import { Class } from '../classes/entities/class.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { ClassStudent } from '../enrollments/entities/class-student.entity';
import { SupportSessionsService } from './support-sessions.service';
import { SupportSessionsController } from './support-sessions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportSession,
      Class,
      Student,
      User,
      ClassStudent,
    ]),
    NotificationsModule,
  ],
  controllers: [SupportSessionsController],
  providers: [SupportSessionsService],
  exports: [SupportSessionsService, TypeOrmModule],
})
export class SupportSessionsModule {}
