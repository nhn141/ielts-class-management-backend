import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EnrollmentStatus } from '../../../common/enums/enrollment-status.enum';
import { Class } from '../../classes/entities/class.entity';
import { Student } from '../../students/entities/student.entity';

@Entity('class_students')
@Unique(['classId', 'studentId'])
export class ClassStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @ManyToOne(() => Class, (cls) => cls.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, (student) => student.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'enrolled_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  enrolledAt: Date;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
