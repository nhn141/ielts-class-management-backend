import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student } from './entities/student.entity';
import { ClassStudent } from '../enrollments/entities/class-student.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { SupportSession } from '../support-sessions/entities/support-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      ClassStudent,
      AttendanceRecord,
      SupportSession,
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService, TypeOrmModule],
})
export class StudentsModule {}

