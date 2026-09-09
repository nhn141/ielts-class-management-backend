import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentStatus } from '../../../common/enums/student-status.enum';
import { Gender } from '../../../common/enums/gender.enum';
import { ClassStudent } from '../../enrollments/entities/class-student.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ name: 'parent_email', type: 'varchar', length: 255, nullable: true })
  parentEmail?: string;

  @Column({
    type: 'enum',
    enum: Gender,
    default: Gender.OTHER,
    nullable: true,
  })
  gender?: Gender;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE,
  })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => ClassStudent, (cs) => cs.student)
  enrollments: ClassStudent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
