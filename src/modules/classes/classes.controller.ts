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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery, Paginated } from 'nestjs-paginate';
import { Class } from './entities/class.entity';

@Controller('classes')
@UseGuards(RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  findAll(@Paginate() query: PaginateQuery, @CurrentUser() currentUser: User): Promise<Paginated<Class>> {
    return this.classesService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.classesService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
