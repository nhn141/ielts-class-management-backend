import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Class } from '../../classes/entities/class.entity';
import { User } from '../../users/entities/user.entity';
import { AttendanceRecord } from './attendance-record.entity';

@Entity('class_sessions')
export class ClassSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate: string; // YYYY-MM-DD

  @Column({ name: 'start_time', type: 'varchar', length: 10, nullable: true })
  startTime?: string; // e.g. "18:00"

  @Column({ name: 'end_time', type: 'varchar', length: 10, nullable: true })
  endTime?: string; // e.g. "19:30"

  @Column({ type: 'text', nullable: true })
  topic?: string;

  @Column({ type: 'text', nullable: true })
  homework?: string;

  @Column({ name: 'lesson_notes', type: 'text', nullable: true })
  lessonNotes?: string;

  @Column({ name: 'materials_url', type: 'varchar', length: 500, nullable: true })
  materialsUrl?: string;

  @Column({ name: 'teacher_id', type: 'uuid', nullable: true })
  teacherId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: User;

  @OneToMany(() => AttendanceRecord, (record) => record.session, { cascade: true })
  attendances: AttendanceRecord[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
