import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery, Paginated } from 'nestjs-paginate';
import { ClassStudent } from './entities/class-student.entity';

@Controller('enrollments')
@UseGuards(RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.enrollmentsService.create(createEnrollmentDto, currentUser);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  findAll(
    @Paginate() query: PaginateQuery,
    @CurrentUser() currentUser: User,
  ): Promise<Paginated<ClassStudent>> {
    return this.enrollmentsService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.enrollmentsService.update(id, updateEnrollmentDto, currentUser);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.enrollmentsService.remove(id, currentUser);
  }
}
