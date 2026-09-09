import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { paginate, FilterOperator } from 'nestjs-paginate';
import type { PaginateConfig, PaginateQuery, Paginated } from 'nestjs-paginate';

export const usersPaginateConfig: PaginateConfig<User> = {
  sortableColumns: ['id', 'email', 'fullName', 'phone', 'gender', 'role', 'isActive', 'createdAt'],
  defaultSortBy: [['createdAt', 'DESC']],
  searchableColumns: ['email', 'fullName', 'phone'],
  filterableColumns: {
    role: [FilterOperator.EQ, FilterOperator.IN],
    gender: [FilterOperator.EQ],
    isActive: [FilterOperator.EQ],
  },
  maxLimit: 100,
  defaultLimit: 10,
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email này đã tồn tại trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      email: createUserDto.email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }

  async findAll(query: PaginateQuery): Promise<Paginated<User>> {
    return paginate(query, this.usersRepository, usersPaginateConfig);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        classes: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy user với id ${id}`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email.toLowerCase().trim() !== user.email) {
      const emailExists = await this.usersRepository.findOne({
        where: { email: updateUserDto.email.toLowerCase().trim() },
      });
      if (emailExists) {
        throw new ConflictException('Email đã tồn tại');
      }
      user.email = updateUserDto.email.toLowerCase().trim();
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.fullName !== undefined) user.fullName = updateUserDto.fullName;
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;
    if (updateUserDto.gender !== undefined) user.gender = updateUserDto.gender;
    if (updateUserDto.role !== undefined) user.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) user.isActive = updateUserDto.isActive;

    const updated = await this.usersRepository.save(user);
    const { password, ...result } = updated;
    return result;
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { success: true, id };
  }
}
