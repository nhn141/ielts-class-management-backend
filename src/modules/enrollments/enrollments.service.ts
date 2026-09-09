import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassStudent } from './entities/class-student.entity';
import { Class } from '../classes/entities/class.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { paginate, FilterOperator } from 'nestjs-paginate';
import type { PaginateConfig, PaginateQuery, Paginated } from 'nestjs-paginate';

export const enrollmentsPaginateConfig: PaginateConfig<ClassStudent> = {
  sortableColumns: ['id', 'status', 'enrolledAt', 'createdAt'],
  defaultSortBy: [['enrolledAt', 'DESC']],
  searchableColumns: ['class.name', 'class.code', 'student.fullName', 'student.phone'],
  filterableColumns: {
    status: [FilterOperator.EQ, FilterOperator.IN],
    classId: [FilterOperator.EQ],
    studentId: [FilterOperator.EQ],
  },
  maxLimit: 100,
  defaultLimit: 10,
};

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(ClassStudent)
    private classStudentsRepository: Repository<ClassStudent>,
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto, currentUser?: User) {
    // If teacher, ensure they only enroll into their own class
    if (currentUser && currentUser.role === Role.TEACHER) {
      const classItem = await this.classesRepository.findOne({
        where: { id: createEnrollmentDto.classId },
      });
      if (!classItem || classItem.teacherId !== currentUser.id) {
        throw new ForbiddenException('Bạn chỉ có quyền phân lớp học viên vào lớp học do mình phụ trách');
      }
    }

    const existing = await this.classStudentsRepository.findOne({
      where: {
        classId: createEnrollmentDto.classId,
        studentId: createEnrollmentDto.studentId,
      },
    });

    if (existing) {
      throw new ConflictException('Học viên đã được thêm vào lớp học này');
    }

    const enrollment = this.classStudentsRepository.create(createEnrollmentDto);
    const saved = await this.classStudentsRepository.save(enrollment);
    return this.findOne(saved.id);
  }

  async findAll(query: PaginateQuery, currentUser?: User): Promise<Paginated<ClassStudent>> {
    const queryBuilder = this.classStudentsRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.class', 'class')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoinAndSelect('cs.student', 'student');

    if (currentUser && currentUser.role === Role.TEACHER) {
      queryBuilder.andWhere('class.teacherId = :teacherId', { teacherId: currentUser.id });
    }

    return paginate(query, queryBuilder, enrollmentsPaginateConfig);
  }

  async findOne(id: string) {
    const enrollment = await this.classStudentsRepository.findOne({
      where: { id },
      relations: {
        class: {
          teacher: true,
        },
        student: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Không tìm thấy thông tin ghi danh với id ${id}`);
    }

    return enrollment;
  }

  async update(id: string, updateEnrollmentDto: UpdateEnrollmentDto, currentUser?: User) {
    const enrollment = await this.findOne(id);

    if (currentUser && currentUser.role === Role.TEACHER) {
      if (enrollment.class?.teacherId !== currentUser.id) {
        throw new ForbiddenException('Bạn chỉ có quyền chỉnh sửa học viên trong lớp của mình');
      }
    }

    if (updateEnrollmentDto.enrolledAt !== undefined) {
      enrollment.enrolledAt = new Date(updateEnrollmentDto.enrolledAt);
    }
    if (updateEnrollmentDto.status !== undefined) {
      enrollment.status = updateEnrollmentDto.status;
    }
    if (updateEnrollmentDto.note !== undefined) {
      enrollment.note = updateEnrollmentDto.note;
    }

    await this.classStudentsRepository.save(enrollment);
    return this.findOne(id);
  }

  async remove(id: string, currentUser?: User) {
    const enrollment = await this.findOne(id);

    if (currentUser && currentUser.role === Role.TEACHER) {
      if (enrollment.class?.teacherId !== currentUser.id) {
        throw new ForbiddenException('Bạn chỉ có quyền xóa học viên khỏi lớp do mình phụ trách');
      }
    }

    await this.classStudentsRepository.remove(enrollment);
    return { success: true, id };
  }
}
