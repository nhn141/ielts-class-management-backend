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
import { ClassLevel } from '../../../common/enums/class-level.enum';
import { ClassStatus } from '../../../common/enums/class-status.enum';
import { User } from '../../users/entities/user.entity';
import { ClassStudent } from '../../enrollments/entities/class-student.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ unique: true, type: 'varchar', length: 100 })
  code: string;

  @Column({
    type: 'enum',
    enum: ClassLevel,
    default: ClassLevel.BASIC,
  })
  level: ClassLevel;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'teacher_id', type: 'uuid', nullable: true })
  teacherId?: string;

  @ManyToOne(() => User, (user) => user.classes, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: User;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @Column({
    type: 'enum',
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
  })
  status: ClassStatus;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  schedules?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
  }[];

  @OneToMany(() => ClassStudent, (cs) => cs.class)
  enrollments: ClassStudent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
