import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SupportSession } from './entities/support-session.entity';
import { CreateSupportSessionDto } from './dto/create-support-session.dto';
import { EvaluateSupportSessionDto } from './dto/evaluate-support-session.dto';
import { QuerySupportSessionDto } from './dto/query-support-session.dto';
import { User } from '../users/entities/user.entity';
import { Class } from '../classes/entities/class.entity';
import { Student } from '../students/entities/student.entity';
import { ClassStudent } from '../enrollments/entities/class-student.entity';
import { Role } from '../../common/enums/role.enum';
import { SupportSkill } from '../../common/enums/support-skill.enum';
import { SupportSessionStatus } from '../../common/enums/support-session-status.enum';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SupportSessionsService {
  private readonly logger = new Logger(SupportSessionsService.name);

  constructor(
    @InjectRepository(SupportSession)
    private readonly supportSessionRepository: Repository<SupportSession>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ClassStudent)
    private readonly enrollmentRepository: Repository<ClassStudent>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper: Check if two time intervals overlap (format HH:mm)
   */
  private checkTimeOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    return startA < endB && endA > startB;
  }

  /**
   * Get active Teaching Assistants for assignment dropdown
   */
  async getTeachingAssistants() {
    return this.userRepository.find({
      where: {
        role: Role.TEACHING_ASSISTANT,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
      },
      order: { fullName: 'ASC' },
    });
  }

  /**
   * Create a new Support Session requested by Teacher
   */
  async create(dto: CreateSupportSessionDto, currentUser: User) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
    }

    // 1. Verify Class
    const cls = await this.classRepository.findOne({
      where: { id: dto.classId },
      relations: { teacher: true },
    });
    if (!cls) {
      throw new NotFoundException(`Không tìm thấy lớp học với id ${dto.classId}`);
    }

    // If currentUser is Teacher, make sure they teach this class (or have admin rights)
    if (
      currentUser.role === Role.TEACHER &&
      cls.teacherId &&
      cls.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException('Bạn chỉ có thể tạo yêu cầu support cho lớp do bạn phụ trách');
    }

    // 2. Verify Student
    const student = await this.studentRepository.findOne({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(`Không tìm thấy học viên với id ${dto.studentId}`);
    }

    // 3. Verify Teaching Assistant
    const ta = await this.userRepository.findOne({
      where: { id: dto.teachingAssistantId },
    });
    if (!ta) {
      throw new NotFoundException(`Không tìm thấy trợ giảng với id ${dto.teachingAssistantId}`);
    }
    if (ta.role !== Role.TEACHING_ASSISTANT && ta.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException('Người được phân công phải có vai trò Trợ giảng');
    }

    // 4. Overlap & Conflict Check Algorithm
    // Fetch all active sessions on the same date
    const existingSessions = await this.supportSessionRepository.find({
      where: {
        sessionDate: dto.sessionDate,
      },
      relations: {
        teacher: true,
        teachingAssistant: true,
        student: true,
        class: true,
      },
    });

    const activeExisting = existingSessions.filter(
      (s) => s.status !== SupportSessionStatus.CANCELLED,
    );

    const newHasExclusiveSkill =
      dto.skills.includes(SupportSkill.SPEAKING) ||
      dto.skills.includes(SupportSkill.VOCABULARY);

    for (const existing of activeExisting) {
      const isOverlap = this.checkTimeOverlap(
        dto.startTime,
        dto.endTime,
        existing.startTime,
        existing.endTime,
      );

      if (isOverlap) {
        const existingHasExclusiveSkill =
          existing.skills &&
          (existing.skills.includes(SupportSkill.SPEAKING) ||
            existing.skills.includes(SupportSkill.VOCABULARY));

        // Rule: If new session has Speaking/Vocab OR existing session has Speaking/Vocab
        // -> CANNOT overlap in time at all (system-wide)!
        if (newHasExclusiveSkill || existingHasExclusiveSkill) {
          const conflictingSkills = existing.skills.join(', ');
          throw new ConflictException(
            `Khung giờ ${existing.startTime} - ${existing.endTime} ngày ${dto.sessionDate} bị trùng lịch với ca support của học viên ${existing.student?.fullName || 'Học viên'} (Kĩ năng: ${conflictingSkills}, Trợ giảng: ${existing.teachingAssistant?.fullName || 'Trợ giảng'}). Các ca có Speaking hoặc Vocabulary không được trùng giờ.`,
          );
        }

        // Rule: For other skills (listening, reading, writing), same student cannot be in 2 sessions simultaneously
        if (existing.studentId === dto.studentId) {
          throw new ConflictException(
            `Học viên ${student.fullName} đã có ca support khác trong khung giờ ${existing.startTime} - ${existing.endTime} ngày ${dto.sessionDate}`,
          );
        }
      }
    }

    // 5. Create and save SupportSession
    const session = this.supportSessionRepository.create({
      classId: dto.classId,
      studentId: dto.studentId,
      teacherId: currentUser.id,
      teachingAssistantId: dto.teachingAssistantId,
      sessionDate: dto.sessionDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      skills: dto.skills,
      teacherNote: dto.teacherNote || null,
      status: SupportSessionStatus.PENDING,
    });

    const saved = await this.supportSessionRepository.save(session);

    // 6. Fetch full record with relations
    const fullSession = await this.supportSessionRepository.findOne({
      where: { id: saved.id },
      relations: {
        class: true,
        student: true,
        teacher: true,
        teachingAssistant: true,
      },
    });

    // 7. Save Notification to DB & Emit Realtime Notification via Socket.IO to TA
    try {
      await this.notificationsService.createAndSend({
        userId: dto.teachingAssistantId,
        title: 'Yêu cầu support học viên mới',
        message: `Giáo viên ${currentUser.fullName || currentUser.email} đã phân công bạn support học viên ${student.fullName} (${cls.name}) vào ngày ${dto.sessionDate} (${dto.startTime} - ${dto.endTime}).`,
        type: 'SUPPORT_REQUEST_CREATED',
        link: '/support-sessions',
        metadata: {
          sessionId: fullSession?.id || saved.id,
          classId: dto.classId,
          studentId: dto.studentId,
          skills: dto.skills,
        },
      });

      // Backward compatibility event
      this.notificationsGateway.sendToUser(
        dto.teachingAssistantId,
        'support_request_created',
        {
          message: `Bạn vừa nhận được yêu cầu support học viên ${student.fullName} (${cls.name}) từ Giáo viên ${currentUser.fullName || currentUser.email}`,
          session: fullSession,
          timestamp: new Date(),
        },
      );
    } catch (err: any) {
      this.logger.warn(`Failed to emit websocket event: ${err.message}`);
    }

    return fullSession;
  }

  /**
   * Get all support sessions with filters
   */
  async findAll(query: QuerySupportSessionDto, currentUser?: User) {
    const qb = this.supportSessionRepository
      .createQueryBuilder('ss')
      .leftJoinAndSelect('ss.class', 'class')
      .leftJoinAndSelect('ss.student', 'student')
      .leftJoinAndSelect('ss.teacher', 'teacher')
      .leftJoinAndSelect('ss.teachingAssistant', 'teachingAssistant')
      .orderBy('ss.sessionDate', 'DESC')
      .addOrderBy('ss.startTime', 'DESC');

    // Role-based filtering if needed
    if (currentUser && currentUser.role === Role.TEACHING_ASSISTANT) {
      qb.andWhere('ss.teachingAssistantId = :taUserId', { taUserId: currentUser.id });
    } else if (currentUser && currentUser.role === Role.TEACHER) {
      if (query.teacherId) {
        qb.andWhere('ss.teacherId = :teacherId', { teacherId: query.teacherId });
      }
    }

    if (query.classId) {
      qb.andWhere('ss.classId = :classId', { classId: query.classId });
    }

    if (query.studentId) {
      qb.andWhere('ss.studentId = :studentId', { studentId: query.studentId });
    }

    if (query.teachingAssistantId) {
      qb.andWhere('ss.teachingAssistantId = :teachingAssistantId', {
        teachingAssistantId: query.teachingAssistantId,
      });
    }

    if (query.teacherId && (!currentUser || currentUser.role !== Role.TEACHER)) {
      qb.andWhere('ss.teacherId = :teacherId', { teacherId: query.teacherId });
    }

    if (query.status) {
      qb.andWhere('ss.status = :status', { status: query.status });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('ss.sessionDate BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    } else if (query.startDate) {
      qb.andWhere('ss.sessionDate >= :startDate', { startDate: query.startDate });
    } else if (query.endDate) {
      qb.andWhere('ss.sessionDate <= :endDate', { endDate: query.endDate });
    }

    const data = await qb.getMany();
    return {
      data,
      total: data.length,
    };
  }

  /**
   * Get sessions assigned to current Teaching Assistant
   */
  async getMySessions(query: QuerySupportSessionDto, currentUser: User) {
    query.teachingAssistantId = currentUser.id;
    return this.findAll(query, currentUser);
  }

  /**
   * Get single session detail
   */
  async findOne(id: string) {
    const session = await this.supportSessionRepository.findOne({
      where: { id },
      relations: {
        class: true,
        student: true,
        teacher: true,
        teachingAssistant: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy ca support với id ${id}`);
    }

    return session;
  }

  /**
   * TA Evaluates Support Session (Điểm danh, Chấm điểm /10, Nhận xét)
   */
  async evaluate(id: string, dto: EvaluateSupportSessionDto, currentUser: User) {
    const session = await this.findOne(id);

    if (
      currentUser.role === Role.TEACHING_ASSISTANT &&
      session.teachingAssistantId !== currentUser.id
    ) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá ca support được phân công cho mình');
    }

    session.isPresent = dto.isPresent;
    session.absenceReason = dto.isPresent ? null : dto.absenceReason?.trim() || null;
    session.score = dto.score !== undefined && dto.score !== null ? Number(dto.score) : null;
    session.taComment = dto.taComment?.trim() || null;
    session.status = SupportSessionStatus.COMPLETED;
    session.evaluatedAt = new Date();

    const updated = await this.supportSessionRepository.save(session);

    // Save Notification to DB & Emit Realtime Notification to Teacher
    try {
      await this.notificationsService.createAndSend({
        userId: session.teacherId,
        title: 'Đã hoàn thành đánh giá ca support',
        message: `Trợ giảng ${currentUser.fullName} đã hoàn thành điểm danh và đánh giá ca support cho học viên ${session.student?.fullName} (${session.class?.name}). Điểm: ${updated.score ?? '-'}/10.`,
        type: 'SUPPORT_SESSION_EVALUATED',
        link: '/support-sessions',
        metadata: {
          sessionId: updated.id,
          score: updated.score,
        },
      });

      this.notificationsGateway.sendToUser(
        session.teacherId,
        'support_session_evaluated',
        {
          message: `Trợ giảng ${currentUser.fullName} đã hoàn thành đánh giá ca support cho học viên ${session.student?.fullName}`,
          session: updated,
          timestamp: new Date(),
        },
      );
    } catch (err: any) {
      this.logger.warn(`Failed to emit websocket event: ${err.message}`);
    }

    return updated;
  }

  /**
   * Cancel a support session
   */
  async cancel(id: string, currentUser: User) {
    const session = await this.findOne(id);

    if (
      currentUser.role === Role.TEACHER &&
      session.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException('Bạn chỉ có thể hủy ca support do bạn tạo');
    }

    session.status = SupportSessionStatus.CANCELLED;
    const updated = await this.supportSessionRepository.save(session);

    // Save Notification to DB & Notify TA
    try {
      await this.notificationsService.createAndSend({
        userId: session.teachingAssistantId,
        title: 'Ca support đã bị hủy',
        message: `Ca support học viên ${session.student?.fullName} ngày ${session.sessionDate} (${session.startTime} - ${session.endTime}) đã bị hủy bởi ${currentUser.fullName}.`,
        type: 'SUPPORT_SESSION_CANCELLED',
        link: '/support-sessions',
        metadata: {
          sessionId: id,
        },
      });

      this.notificationsGateway.sendToUser(
        session.teachingAssistantId,
        'support_session_cancelled',
        {
          message: `Ca support học viên ${session.student?.fullName} ngày ${session.sessionDate} đã bị hủy bởi ${currentUser.fullName}`,
          sessionId: id,
          timestamp: new Date(),
        },
      );
    } catch (err: any) {
      this.logger.warn(`Failed to emit websocket event: ${err.message}`);
    }

    return updated;
  }
}
