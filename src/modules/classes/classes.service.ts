import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { paginate, FilterOperator } from 'nestjs-paginate';
import type { PaginateConfig, PaginateQuery, Paginated } from 'nestjs-paginate';

export const classesPaginateConfig: PaginateConfig<Class> = {
  sortableColumns: ['id', 'code', 'name', 'level', 'status', 'startDate', 'endDate', 'createdAt'],
  defaultSortBy: [['createdAt', 'DESC']],
  searchableColumns: ['code', 'name'],
  filterableColumns: {
    status: [FilterOperator.EQ, FilterOperator.IN],
    level: [FilterOperator.EQ, FilterOperator.IN],
    teacherId: [FilterOperator.EQ],
  },
  maxLimit: 100,
  defaultLimit: 10,
};

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
  ) {}

  async create(createClassDto: CreateClassDto) {
    const existing = await this.classesRepository.findOne({
      where: { code: createClassDto.code.trim().toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Mã lớp ${createClassDto.code} đã tồn tại`);
    }

    const newClass = this.classesRepository.create({
      ...createClassDto,
      code: createClassDto.code.trim().toUpperCase(),
    });

    return this.classesRepository.save(newClass);
  }

  async findAll(query: PaginateQuery, currentUser: User): Promise<Paginated<Class>> {
    const queryBuilder = this.classesRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoinAndSelect('class.enrollments', 'enrollments')
      .leftJoinAndSelect('enrollments.student', 'student');

    return paginate(query, queryBuilder, classesPaginateConfig);
  }

  async findOne(id: string, currentUser?: User) {
    const classItem = await this.classesRepository.findOne({
      where: { id },
      relations: {
        teacher: true,
        enrollments: {
          student: true,
        },
      },
    });

    if (!classItem) {
      throw new NotFoundException(`Không tìm thấy lớp học với id ${id}`);
    }

    return classItem;
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    const classItem = await this.findOne(id);

    if (updateClassDto.code && updateClassDto.code.trim().toUpperCase() !== classItem.code) {
      const codeExists = await this.classesRepository.findOne({
        where: { code: updateClassDto.code.trim().toUpperCase() },
      });
      if (codeExists) {
        throw new ConflictException(`Mã lớp ${updateClassDto.code} đã tồn tại`);
      }
      classItem.code = updateClassDto.code.trim().toUpperCase();
    }

    if (updateClassDto.name !== undefined) classItem.name = updateClassDto.name;
    if (updateClassDto.level !== undefined) classItem.level = updateClassDto.level;
    if (updateClassDto.note !== undefined) classItem.note = updateClassDto.note;
    if (updateClassDto.teacherId !== undefined) classItem.teacherId = updateClassDto.teacherId;
    if (updateClassDto.startDate !== undefined) classItem.startDate = updateClassDto.startDate;
    if (updateClassDto.endDate !== undefined) classItem.endDate = updateClassDto.endDate;
    if (updateClassDto.status !== undefined) classItem.status = updateClassDto.status;
    if (updateClassDto.schedules !== undefined) classItem.schedules = updateClassDto.schedules;

    return this.classesRepository.save(classItem);
  }

  async remove(id: string) {
    const classItem = await this.findOne(id);
    await this.classesRepository.remove(classItem);
    return { success: true, id };
  }
}
