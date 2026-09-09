import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ClassSession } from './entities/class-session.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Class } from '../classes/entities/class.entity';
import { ClassStudent } from '../enrollments/entities/class-student.entity';
import { Student } from '../students/entities/student.entity';
import { SupportSession } from '../support-sessions/entities/support-session.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassSession,
      AttendanceRecord,
      Class,
      ClassStudent,
      Student,
      SupportSession,
    ]),
    MailModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
