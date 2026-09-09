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
import { ClassSession } from './class-session.entity';
import { Student } from '../../students/entities/student.entity';

@Entity('attendance_records')
@Unique(['sessionId', 'studentId'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => ClassSession, (session) => session.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ClassSession;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'is_present', type: 'boolean', default: true })
  isPresent: boolean;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  score?: number | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
