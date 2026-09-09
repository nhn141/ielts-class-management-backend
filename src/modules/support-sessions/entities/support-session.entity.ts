import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Class } from '../../classes/entities/class.entity';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';
import { SupportSkill } from '../../../common/enums/support-skill.enum';
import { SupportSessionStatus } from '../../../common/enums/support-session-status.enum';

@Entity('support_sessions')
export class SupportSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ name: 'teaching_assistant_id', type: 'uuid' })
  teachingAssistantId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teaching_assistant_id' })
  teachingAssistant: User;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate: string;

  @Column({ name: 'start_time', type: 'varchar', length: 10 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 10 })
  endTime: string;

  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  skills: SupportSkill[];

  @Column({ name: 'teacher_note', type: 'text', nullable: true })
  teacherNote?: string | null;

  @Column({
    type: 'enum',
    enum: SupportSessionStatus,
    default: SupportSessionStatus.PENDING,
  })
  status: SupportSessionStatus;

  @Column({ name: 'is_present', type: 'boolean', nullable: true })
  isPresent?: boolean | null;

  @Column({ name: 'absence_reason', type: 'text', nullable: true })
  absenceReason?: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  score?: number | null;

  @Column({ name: 'ta_comment', type: 'text', nullable: true })
  taComment?: string | null;

  @Column({ name: 'evaluated_at', type: 'timestamptz', nullable: true })
  evaluatedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
