import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student } from './entities/student.entity';
import { ClassStudent } from '../enrollments/entities/class-student.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, ClassStudent])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService, TypeOrmModule],
})
export class StudentsModule {}
