import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { ClassStudent } from './entities/class-student.entity';
import { Class } from '../classes/entities/class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClassStudent, Class])],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService, TypeOrmModule],
})
export class EnrollmentsModule {}
