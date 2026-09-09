import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupportSessionsService } from './support-sessions.service';
import { CreateSupportSessionDto } from './dto/create-support-session.dto';
import { EvaluateSupportSessionDto } from './dto/evaluate-support-session.dto';
import { QuerySupportSessionDto } from './dto/query-support-session.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('support-sessions')
@UseGuards(RolesGuard)
export class SupportSessionsController {
  constructor(private readonly supportSessionsService: SupportSessionsService) {}

  /**
   * Teacher creates a support request assigning a Teaching Assistant
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  async create(
    @Body() dto: CreateSupportSessionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.supportSessionsService.create(dto, currentUser);
  }

  /**
   * Get list of all support sessions with filters
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async findAll(
    @Query() query: QuerySupportSessionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.supportSessionsService.findAll(query, currentUser);
  }

  /**
   * Endpoint for Teaching Assistant to view their assigned support sessions
   */
  @Get('my-sessions')
  @Roles(Role.SUPER_ADMIN, Role.TEACHING_ASSISTANT)
  async getMySessions(
    @Query() query: QuerySupportSessionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.supportSessionsService.getMySessions(query, currentUser);
  }

  /**
   * Get active Teaching Assistants for assignment dropdown
   */
  @Get('teaching-assistants')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async getTeachingAssistants() {
    return this.supportSessionsService.getTeachingAssistants();
  }

  /**
   * Get detail of a specific support session
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportSessionsService.findOne(id);
  }

  /**
   * Teaching Assistant performs attendance & evaluation for a support session
   */
  @Put(':id/evaluate')
  @Roles(Role.SUPER_ADMIN, Role.TEACHING_ASSISTANT)
  async evaluate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EvaluateSupportSessionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.supportSessionsService.evaluate(id, dto, currentUser);
  }

  /**
   * Cancel a support session
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.supportSessionsService.cancel(id, currentUser);
  }
}
