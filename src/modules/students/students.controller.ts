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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery, Paginated } from 'nestjs-paginate';
import { Student } from './entities/student.entity';

@Controller('students')
@UseGuards(RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  findAll(@Paginate() query: PaginateQuery, @CurrentUser() currentUser: User): Promise<Paginated<Student>> {
    return this.studentsService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.studentsService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.studentsService.update(id, updateStudentDto, currentUser);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
