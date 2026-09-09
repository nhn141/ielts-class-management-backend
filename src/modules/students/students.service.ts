import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { ClassStudent } from '../enrollments/entities/class-student.entity';
import { paginate, FilterOperator } from 'nestjs-paginate';
import type { PaginateConfig, PaginateQuery, Paginated } from 'nestjs-paginate';

export const studentsPaginateConfig: PaginateConfig<Student> = {
  sortableColumns: ['id', 'fullName', 'phone', 'email', 'parentEmail', 'gender', 'status', 'createdAt'],
  defaultSortBy: [['createdAt', 'DESC']],
  searchableColumns: ['fullName', 'phone', 'email', 'parentEmail'],
  filterableColumns: {
    status: [FilterOperator.EQ, FilterOperator.IN],
    gender: [FilterOperator.EQ],
    'enrollments.classId': [FilterOperator.EQ, FilterOperator.IN],
    'enrollments.class.teacherId': [FilterOperator.EQ],
  },
  maxLimit: 100,
  defaultLimit: 10,
};

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(ClassStudent)
    private classStudentsRepository: Repository<ClassStudent>,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    const { classId, ...studentData } = createStudentDto;

    const student = this.studentsRepository.create(studentData);
    const savedStudent = await this.studentsRepository.save(student);

    if (classId) {
      const enrollment = this.classStudentsRepository.create({
        classId,
        studentId: savedStudent.id,
      });
      await this.classStudentsRepository.save(enrollment);
    }

    return this.findOne(savedStudent.id);
  }

  async findAll(query: PaginateQuery, currentUser?: User): Promise<Paginated<Student>> {
    const queryBuilder = this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.enrollments', 'enrollments')
      .leftJoinAndSelect('enrollments.class', 'class')
      .leftJoinAndSelect('class.teacher', 'teacher');

    return paginate(query, queryBuilder, studentsPaginateConfig);
  }

  async findOne(id: string, currentUser?: User) {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: {
        enrollments: {
          class: {
            teacher: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy học viên với id ${id}`);
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, currentUser?: User) {
    const student = await this.findOne(id, currentUser);

    // If teacher, only allow updating students enrolled in their class
    if (currentUser && currentUser.role === Role.TEACHER) {
      const isEnrolledInTeacherClass = student.enrollments?.some(
        (e) => e.class?.teacherId === currentUser.id,
      );
      if (!isEnrolledInTeacherClass) {
        throw new ForbiddenException(
          'Bạn chỉ có thể chỉnh sửa thông tin học viên đang theo học tại lớp do mình phụ trách',
        );
      }
    }

    if (updateStudentDto.fullName !== undefined) student.fullName = updateStudentDto.fullName;
    if (updateStudentDto.phone !== undefined) student.phone = updateStudentDto.phone;
    if (updateStudentDto.email !== undefined) student.email = updateStudentDto.email;
    if (updateStudentDto.parentEmail !== undefined) student.parentEmail = updateStudentDto.parentEmail;
    if (updateStudentDto.gender !== undefined) student.gender = updateStudentDto.gender;
    if (updateStudentDto.status !== undefined) student.status = updateStudentDto.status;
    if (updateStudentDto.notes !== undefined) student.notes = updateStudentDto.notes;

    return this.studentsRepository.save(student);
  }

  async remove(id: string) {
    const student = await this.findOne(id);
    await this.studentsRepository.remove(student);
    return { success: true, id };
  }
}
