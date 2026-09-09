import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { EnsureSessionDto } from './dto/ensure-session.dto';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { UpdateLessonLogDto } from './dto/update-lesson-log.dto';
import { SendWeeklyReportsDto } from './dto/send-weekly-reports.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('attendance')
@UseGuards(RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Get all sessions for a specific class
   */
  @Get('classes/:classId/sessions')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async getSessionsByClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.getSessionsByClass(classId, currentUser);
  }

  /**
   * Ensure/Create a session for a given class and date
   */
  @Post('sessions/ensure')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async ensureSession(
    @Body() dto: EnsureSessionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.ensureSession(dto, currentUser);
  }

  /**
   * Get session details with all student attendance records
   */
  @Get('sessions/:sessionId')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async getSessionDetail(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.getSessionDetail(sessionId, currentUser);
  }

  /**
   * Save batch attendance and evaluations for a session
   */
  @Put('sessions/:sessionId/batch')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async saveBatchAttendance(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: BatchAttendanceDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.saveBatchAttendance(sessionId, dto, currentUser);
  }

  /**
   * Get weekly learning summary for a class
   */
  @Get('classes/:classId/weekly-summary')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async getWeeklySummary(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.getWeeklySummary(classId, startDate, endDate, currentUser);
  }

  /**
   * Get curriculum & lesson progress timeline for a class
   */
  @Get('classes/:classId/curriculum')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.TEACHING_ASSISTANT)
  async getCurriculum(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.getCurriculum(classId, currentUser);
  }

  /**
   * Update lesson log (topic, homework, lessonNotes, materialsUrl) for a session
   */
  @Put('sessions/:sessionId/lesson-log')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  async updateLessonLog(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateLessonLogDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.updateLessonLog(sessionId, dto, currentUser);
  }

  /**
   * Trigger weekly report email dispatch
   */
  @Post('send-weekly-reports')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  async sendWeeklyReports(
    @Body() dto: SendWeeklyReportsDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.sendWeeklyReports(dto, currentUser);
  }
}
