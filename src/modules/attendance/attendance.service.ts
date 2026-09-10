import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { ClassSession } from './entities/class-session.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Class } from '../classes/entities/class.entity';
import { ClassStudent } from '../enrollments/entities/class-student.entity';
import { Student } from '../students/entities/student.entity';
import { SupportSession } from '../support-sessions/entities/support-session.entity';
import { SupportSessionStatus } from '../../common/enums/support-session-status.enum';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { EnsureSessionDto } from './dto/ensure-session.dto';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { UpdateLessonLogDto } from './dto/update-lesson-log.dto';
import { SendWeeklyReportsDto } from './dto/send-weekly-reports.dto';
import { MailService, ISessionReportItem, ISupportReportItem } from '../mail/mail.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(ClassSession)
    private sessionRepository: Repository<ClassSession>,
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(ClassStudent)
    private classStudentRepository: Repository<ClassStudent>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(SupportSession)
    private supportSessionRepository: Repository<SupportSession>,
    private mailService: MailService,
  ) {}

  /**
   * Get all sessions of a specific class
   */
  async getSessionsByClass(classId: string, currentUser?: User) {
    const cls = await this.classRepository.findOne({
      where: { id: classId },
    });

    if (!cls) {
      throw new NotFoundException(`Không tìm thấy lớp học với id ${classId}`);
    }

    // Role check: Teacher can only access their own class
    if (currentUser && currentUser.role === Role.TEACHER && cls.teacherId !== currentUser.id) {
      throw new ForbiddenException('Bạn chỉ có quyền xem lớp do mình phụ trách');
    }

    return this.sessionRepository.find({
      where: { classId },
      order: {
        sessionDate: 'DESC',
        startTime: 'ASC',
      },
      relations: {
        teacher: true,
        attendances: true,
      },
    });
  }

  /**
   * Get curriculum & lesson progress timeline for a class
   */
  async getCurriculum(classId: string, currentUser?: User) {
    const cls = await this.classRepository.findOne({
      where: { id: classId },
      relations: {
        teacher: true,
      },
    });

    if (!cls) {
      throw new NotFoundException(`Không tìm thấy lớp học với id ${classId}`);
    }

    if (currentUser && currentUser.role === Role.TEACHER && cls.teacherId !== currentUser.id) {
      throw new ForbiddenException('Bạn chỉ có quyền xem tiến trình của lớp do mình phụ trách');
    }

    // Get all recorded sessions in database
    const recordedSessions = await this.sessionRepository.find({
      where: { classId },
      order: {
        sessionDate: 'ASC',
        startTime: 'ASC',
      },
      relations: {
        teacher: true,
        attendances: true,
      },
    });

    // Map existing sessions by date and start_time
    const recordedMap = new Map<string, ClassSession>();
    recordedSessions.forEach((s) => {
      const key = `${s.sessionDate}_${s.startTime || ''}`;
      recordedMap.set(key, s);
    });

    // Project planned sessions based on startDate, endDate and schedules
    const timelineItems: Array<{
      id: string | null;
      sessionNumber?: number;
      sessionDate: string;
      startTime?: string;
      endTime?: string;
      room?: string;
      topic?: string | null;
      homework?: string | null;
      lessonNotes?: string | null;
      materialsUrl?: string | null;
      teacherName?: string;
      status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING';
      isCustom: boolean;
      totalStudents: number;
      presentCount: number;
      absentCount: number;
      attendanceRate: number | null;
      avgScore: number | null;
      attendancesCount: number;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const matchedRecordedIds = new Set<string>();

    if (cls.startDate && cls.schedules && cls.schedules.length > 0) {
      // Mapping JS day to custom schedule dayOfWeek (2=Mon, ..., 8=Sun)
      const jsDayToScheduleDay = (jsDay: number) => (jsDay === 0 ? 8 : jsDay + 1);

      // Determine date range for projected schedule
      const start = new Date(cls.startDate);
      let end: Date;
      if (cls.endDate) {
        end = new Date(cls.endDate);
      } else {
        end = new Date(start);
        end.setMonth(end.getMonth() + 3);
      }

      // Ensure start <= end and iterate day by day (limit max 365 days)
      const current = new Date(start);
      let dayCount = 0;

      while (current <= end && dayCount < 365) {
        const dateStr = current.toISOString().split('T')[0];
        const schDay = jsDayToScheduleDay(current.getDay());

        // Find all schedule slots for this day
        const daySchedules = cls.schedules.filter((s) => Number(s.dayOfWeek) === schDay);

        for (const sch of daySchedules) {
          const key = `${dateStr}_${sch.startTime || ''}`;
          const existingSession = recordedMap.get(key);

          if (existingSession) {
            matchedRecordedIds.add(existingSession.id);
            const attendances = existingSession.attendances || [];
            const presentCount = attendances.filter((a) => a.isPresent).length;
            const absentCount = attendances.length - presentCount;
            const attendanceRate =
              attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : null;
            const scored = attendances.filter(
              (a) => a.score !== null && a.score !== undefined && !isNaN(Number(a.score)),
            );
            const avgScore =
              scored.length > 0
                ? Number((scored.reduce((sum, a) => sum + Number(a.score), 0) / scored.length).toFixed(1))
                : null;

            let status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' = 'UPCOMING';
            if (attendances.length > 0 || (existingSession.topic && dateStr < todayStr)) {
              status = 'COMPLETED';
            } else if (dateStr === todayStr) {
              status = 'IN_PROGRESS';
            }

            timelineItems.push({
              id: existingSession.id,
              sessionDate: existingSession.sessionDate,
              startTime: existingSession.startTime || sch.startTime,
              endTime: existingSession.endTime || sch.endTime,
              room: sch.room,
              topic: existingSession.topic || null,
              homework: existingSession.homework || null,
              lessonNotes: existingSession.lessonNotes || null,
              materialsUrl: existingSession.materialsUrl || null,
              teacherName: existingSession.teacher?.fullName || cls.teacher?.fullName,
              status,
              isCustom: false,
              totalStudents: attendances.length,
              presentCount,
              absentCount,
              attendanceRate,
              avgScore,
              attendancesCount: attendances.length,
            });
          } else {
            let status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' = 'UPCOMING';
            if (dateStr === todayStr) {
              status = 'IN_PROGRESS';
            }

            timelineItems.push({
              id: null,
              sessionDate: dateStr,
              startTime: sch.startTime,
              endTime: sch.endTime,
              room: sch.room,
              topic: null,
              homework: null,
              lessonNotes: null,
              materialsUrl: null,
              teacherName: cls.teacher?.fullName,
              status,
              isCustom: false,
              totalStudents: 0,
              presentCount: 0,
              absentCount: 0,
              attendanceRate: null,
              avgScore: null,
              attendancesCount: 0,
            });
          }
        }

        current.setDate(current.getDate() + 1);
        dayCount++;
      }
    }

    // Add any recorded sessions that were not part of the standard schedules (e.g. custom/makeup sessions)
    for (const s of recordedSessions) {
      if (!matchedRecordedIds.has(s.id)) {
        const attendances = s.attendances || [];
        const presentCount = attendances.filter((a) => a.isPresent).length;
        const absentCount = attendances.length - presentCount;
        const attendanceRate =
          attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : null;
        const scored = attendances.filter(
          (a) => a.score !== null && a.score !== undefined && !isNaN(Number(a.score)),
        );
        const avgScore =
          scored.length > 0
            ? Number((scored.reduce((sum, a) => sum + Number(a.score), 0) / scored.length).toFixed(1))
            : null;

        let status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' = 'UPCOMING';
        if (attendances.length > 0 || (s.topic && s.sessionDate < todayStr)) {
          status = 'COMPLETED';
        } else if (s.sessionDate === todayStr) {
          status = 'IN_PROGRESS';
        }

        timelineItems.push({
          id: s.id,
          sessionDate: s.sessionDate,
          startTime: s.startTime,
          endTime: s.endTime,
          room: undefined,
          topic: s.topic || null,
          homework: s.homework || null,
          lessonNotes: s.lessonNotes || null,
          materialsUrl: s.materialsUrl || null,
          teacherName: s.teacher?.fullName || cls.teacher?.fullName,
          status,
          isCustom: true,
          totalStudents: attendances.length,
          presentCount,
          absentCount,
          attendanceRate,
          avgScore,
          attendancesCount: attendances.length,
        });
      }
    }

    // Sort timeline by sessionDate ASC, startTime ASC
    timelineItems.sort((a, b) => {
      const dateCmp = a.sessionDate.localeCompare(b.sessionDate);
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    // Assign session numbers
    timelineItems.forEach((item, idx) => {
      item.sessionNumber = idx + 1;
    });

    // Summary calculations
    const totalSessions = timelineItems.length;
    const completedSessions = timelineItems.filter(
      (s) => s.status === 'COMPLETED' || s.attendancesCount > 0 || s.topic,
    ).length;
    const upcomingSessions = totalSessions - completedSessions;
    const progressPercent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const completedWithAttendance = timelineItems.filter((s) => s.attendanceRate !== null);
    const avgAttendanceRate =
      completedWithAttendance.length > 0
        ? Math.round(
            completedWithAttendance.reduce((sum, s) => sum + (s.attendanceRate || 0), 0) /
              completedWithAttendance.length,
          )
        : null;

    const completedWithScore = timelineItems.filter((s) => s.avgScore !== null);
    const avgScore =
      completedWithScore.length > 0
        ? Number(
            (
              completedWithScore.reduce((sum, s) => sum + Number(s.avgScore), 0) /
              completedWithScore.length
            ).toFixed(1),
          )
        : null;

    return {
      class: {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        level: cls.level,
        startDate: cls.startDate,
        endDate: cls.endDate,
        teacherName: cls.teacher?.fullName || 'Chưa phân công',
      },
      summary: {
        totalSessions,
        completedSessions,
        upcomingSessions,
        progressPercent,
        avgAttendanceRate,
        avgScore,
      },
      sessions: timelineItems,
    };
  }

  /**
   * Update lesson log (topic, homework, lessonNotes, materialsUrl) for a session
   */
  async updateLessonLog(sessionId: string, dto: UpdateLessonLogDto, currentUser?: User) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: {
        class: true,
        teacher: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy ca học với id ${sessionId}`);
    }

    if (
      currentUser &&
      currentUser.role === Role.TEACHER &&
      session.class?.teacherId !== currentUser.id &&
      session.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật bài học cho lớp do mình phụ trách');
    }

    if (dto.topic !== undefined) session.topic = dto.topic;
    if (dto.homework !== undefined) session.homework = dto.homework;
    if (dto.lessonNotes !== undefined) session.lessonNotes = dto.lessonNotes;
    if (dto.materialsUrl !== undefined) session.materialsUrl = dto.materialsUrl;

    return this.sessionRepository.save(session);
  }

  /**
   * Ensure a session exists for a specific class, date, and optional time slot
   */
  async ensureSession(dto: EnsureSessionDto, currentUser?: User) {
    const cls = await this.classRepository.findOne({
      where: { id: dto.classId },
    });

    if (!cls) {
      throw new NotFoundException(`Không tìm thấy lớp học với id ${dto.classId}`);
    }

    if (currentUser && currentUser.role === Role.TEACHER && cls.teacherId !== currentUser.id) {
      throw new ForbiddenException('Bạn chỉ có thể điểm danh lớp do mình phụ trách');
    }

    const whereCondition: any = {
      classId: dto.classId,
      sessionDate: dto.sessionDate,
    };
    if (dto.startTime) {
      whereCondition.startTime = dto.startTime;
    }

    let session = await this.sessionRepository.findOne({
      where: whereCondition,
      relations: {
        teacher: true,
        attendances: {
          student: true,
        },
      },
    });

    if (!session) {
      const newSession = this.sessionRepository.create({
        classId: dto.classId,
        sessionDate: dto.sessionDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        topic: dto.topic,
        homework: dto.homework,
        lessonNotes: dto.lessonNotes,
        materialsUrl: dto.materialsUrl,
        teacherId: cls.teacherId || (currentUser?.id ?? undefined),
      });
      session = await this.sessionRepository.save(newSession);
    } else {
      let updated = false;
      if (dto.topic !== undefined && dto.topic !== session.topic) {
        session.topic = dto.topic;
        updated = true;
      }
      if (dto.homework !== undefined && dto.homework !== session.homework) {
        session.homework = dto.homework;
        updated = true;
      }
      if (dto.lessonNotes !== undefined && dto.lessonNotes !== session.lessonNotes) {
        session.lessonNotes = dto.lessonNotes;
        updated = true;
      }
      if (dto.materialsUrl !== undefined && dto.materialsUrl !== session.materialsUrl) {
        session.materialsUrl = dto.materialsUrl;
        updated = true;
      }
      if (updated) {
        session = await this.sessionRepository.save(session);
      }
    }

    return this.getSessionDetail(session.id, currentUser);
  }

  /**
   * Get session detail with all enrolled students & their attendance records
   */
  async getSessionDetail(sessionId: string, currentUser?: User) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: {
        class: {
          teacher: true,
        },
        teacher: true,
        attendances: {
          student: true,
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy ca học với id ${sessionId}`);
    }

    if (
      currentUser &&
      currentUser.role === Role.TEACHER &&
      session.class?.teacherId !== currentUser.id &&
      session.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException('Bạn chỉ có quyền xem ca học do mình phụ trách');
    }

    // Get all active enrolled students in this class
    const enrollments = await this.classStudentRepository.find({
      where: { classId: session.classId },
      relations: {
        student: true,
      },
      order: { createdAt: 'ASC' },
    });

    // Map each enrolled student with their attendance record if exists
    const attendanceMap = new Map<string, AttendanceRecord>();
    (session.attendances || []).forEach((att) => {
      attendanceMap.set(att.studentId, att);
    });

    const studentsWithAttendance = enrollments.map((enrollment) => {
      const student = enrollment.student;
      const record = attendanceMap.get(student.id);

      return {
        studentId: student.id,
        fullName: student.fullName,
        phone: student.phone,
        email: student.email,
        parentEmail: student.parentEmail,
        enrollmentStatus: enrollment.status,
        attendanceRecordId: record ? record.id : null,
        isPresent: record ? record.isPresent : true,
        reason: record && record.reason ? record.reason : '',
        score: record && record.score !== null && record.score !== undefined ? Number(record.score) : null,
        comment: record && record.comment ? record.comment : '',
      };
    });

    let sessionNumber: number | null = null;
    let totalSessions = 0;
    let isCustom = false;

    try {
      const curriculum = await this.getCurriculum(session.classId, currentUser);
      const allSessions = curriculum.sessions || [];
      totalSessions = allSessions.length;
      const matched = allSessions.find((s) => {
        if (s.id && s.id === session.id) return true;
        const sameDate = s.sessionDate === session.sessionDate;
        const sameTime = session.startTime ? s.startTime === session.startTime : true;
        return sameDate && sameTime;
      });
      if (matched) {
        sessionNumber = matched.sessionNumber || null;
        isCustom = matched.isCustom || false;
      }
    } catch {
      // Fallback gracefully
    }

    return {
      session: {
        id: session.id,
        classId: session.classId,
        className: session.class?.name,
        classCode: session.class?.code,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        topic: session.topic,
        homework: session.homework,
        lessonNotes: session.lessonNotes,
        materialsUrl: session.materialsUrl,
        teacherName: session.teacher?.fullName || session.class?.teacher?.fullName,
        sessionNumber,
        totalSessions,
        isCustom,
      },
      students: studentsWithAttendance,
    };
  }

  /**
   * Save or update batch attendance and evaluations for a session
   */
  async saveBatchAttendance(sessionId: string, dto: BatchAttendanceDto, currentUser?: User) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: {
        class: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy ca học với id ${sessionId}`);
    }

    if (
      currentUser &&
      currentUser.role === Role.TEACHER &&
      session.class?.teacherId !== currentUser.id &&
      session.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException('Bạn chỉ có thể lưu điểm danh cho lớp do mình phụ trách');
    }

    if (dto.topic !== undefined) session.topic = dto.topic;
    if (dto.homework !== undefined) session.homework = dto.homework;
    if (dto.lessonNotes !== undefined) session.lessonNotes = dto.lessonNotes;
    if (dto.materialsUrl !== undefined) session.materialsUrl = dto.materialsUrl;
    await this.sessionRepository.save(session);

    // Upsert attendance records
    for (const item of dto.records) {
      let record = await this.attendanceRepository.findOne({
        where: { sessionId, studentId: item.studentId },
      });

      if (!record) {
        record = this.attendanceRepository.create({
          sessionId,
          studentId: item.studentId,
          isPresent: item.isPresent,
          reason: item.reason?.trim() || null,
          score: item.score !== undefined && item.score !== null ? Number(item.score) : null,
          comment: item.comment?.trim() || null,
        });
      } else {
        record.isPresent = item.isPresent;
        record.reason = item.reason?.trim() || null;
        record.score = item.score !== undefined && item.score !== null ? Number(item.score) : null;
        record.comment = item.comment?.trim() || null;
      }

      await this.attendanceRepository.save(record);
    }

    return this.getSessionDetail(sessionId, currentUser);
  }

  /**
   * Aggregate weekly learning summary for a class or across classes
   */
  async getWeeklySummary(classId: string, startDate: string, endDate: string, currentUser?: User) {
    const cls = await this.classRepository.findOne({
      where: { id: classId },
      relations: {
        teacher: true,
      },
    });

    if (!cls) {
      throw new NotFoundException(`Không tìm thấy lớp học với id ${classId}`);
    }

    const sessions = await this.sessionRepository.find({
      where: {
        classId,
        sessionDate: Between(startDate, endDate),
      },
      order: { sessionDate: 'ASC', startTime: 'ASC' },
      relations: {
        attendances: {
          student: true,
        },
      },
    });

    // Only count sessions that have recorded attendance
    const recordedSessions = sessions.filter(
      (s) => s.attendances && s.attendances.length > 0,
    );

    // Also fetch completed support sessions for students in this class during the week
    const supportSessions = await this.supportSessionRepository.find({
      where: {
        classId,
        sessionDate: Between(startDate, endDate),
        status: SupportSessionStatus.COMPLETED,
      },
      relations: {
        teachingAssistant: true,
      },
      order: { sessionDate: 'ASC', startTime: 'ASC' },
    });

    const enrollments = await this.classStudentRepository.find({
      where: { classId },
      relations: {
        student: true,
      },
      order: { createdAt: 'ASC' },
    });

    const studentSummaries = enrollments.map((enr) => {
      const student = enr.student;
      const records: ISessionReportItem[] = [];

      recordedSessions.forEach((s) => {
        const att = s.attendances?.find((a) => a.studentId === student.id);
        if (att) {
          records.push({
            sessionDate: s.sessionDate,
            startTime: s.startTime,
            endTime: s.endTime,
            topic: s.topic,
            isPresent: att.isPresent,
            reason: att.reason || undefined,
            score: att.score !== null && att.score !== undefined ? Number(att.score) : null,
            comment: att.comment || undefined,
          });
        }
      });

      // Filter support sessions for this student
      const studentSupportRecords: ISupportReportItem[] = supportSessions
        .filter((ss) => ss.studentId === student.id)
        .map((ss) => ({
          id: ss.id,
          sessionDate: ss.sessionDate,
          startTime: ss.startTime,
          endTime: ss.endTime,
          skills: ss.skills,
          isPresent: ss.isPresent ?? true,
          absenceReason: ss.absenceReason || undefined,
          score: ss.score !== null && ss.score !== undefined ? Number(ss.score) : null,
          taComment: ss.taComment || undefined,
          taName: ss.teachingAssistant?.fullName || 'Trợ giảng',
          teacherNote: ss.teacherNote || undefined,
        }));

      const total = records.length;
      const present = records.filter((r) => r.isPresent).length;
      const absent = total - present;
      const scored = records.filter((r) => r.score !== null && r.score !== undefined && !isNaN(Number(r.score)));
      const avgScore =
        scored.length > 0
          ? Number((scored.reduce((sum, r) => sum + Number(r.score), 0) / scored.length).toFixed(1))
          : null;

      return {
        student: {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          parentEmail: student.parentEmail,
        },
        totalSessions: total,
        presentSessions: present,
        absentSessions: absent,
        avgScore,
        records,
        supportRecords: studentSupportRecords,
      };
    });

    return {
      class: {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        teacherName: cls.teacher?.fullName || 'Thầy Thành',
      },
      weekRange: { start: startDate, end: endDate },
      totalSessionsInWeek: recordedSessions.length,
      studentSummaries,
    };
  }

  /**
   * Send weekly report emails to students and parents
   */
  async sendWeeklyReports(dto: SendWeeklyReportsDto, currentUser?: User) {
    let classesToProcess: Class[] = [];

    if (dto.classId) {
      const cls = await this.classRepository.findOne({
        where: { id: dto.classId },
        relations: {
          teacher: true,
        },
      });
      if (!cls) throw new NotFoundException('Lớp học không tồn tại');
      classesToProcess = [cls];
    } else {
      classesToProcess = await this.classRepository.find({
        relations: {
          teacher: true,
        },
      });
    }

    const results = {
      totalClasses: classesToProcess.length,
      totalStudents: 0,
      sentSuccess: 0,
      sentFailed: 0,
      skippedNoEmail: 0,
      details: [] as any[],
    };

    for (const cls of classesToProcess) {
      const summary = await this.getWeeklySummary(cls.id, dto.startDate, dto.endDate, currentUser);

      for (const item of summary.studentSummaries) {
        results.totalStudents++;

        if (!item.student.email && !item.student.parentEmail) {
          results.skippedNoEmail++;
          results.details.push({
            studentName: item.student.fullName,
            className: cls.name,
            status: 'SKIPPED_NO_EMAIL',
            message: 'Học viên và phụ huynh chưa cập nhật địa chỉ email',
          });
          continue;
        }

        const sendResult = await this.mailService.sendWeeklyReportMail({
          student: {
            fullName: item.student.fullName,
            email: item.student.email,
            parentEmail: item.student.parentEmail,
          },
          className: cls.name,
          teacherName: cls.teacher?.fullName || 'Thầy Thành',
          weekRange: { start: dto.startDate, end: dto.endDate },
          records: item.records,
          supportRecords: item.supportRecords,
        });

        if (sendResult.success) {
          results.sentSuccess++;
          results.details.push({
            studentName: item.student.fullName,
            className: cls.name,
            email: item.student.email,
            parentEmail: item.student.parentEmail,
            status: 'SENT',
          });
        } else {
          results.sentFailed++;
          results.details.push({
            studentName: item.student.fullName,
            className: cls.name,
            email: item.student.email,
            parentEmail: item.student.parentEmail,
            status: 'FAILED',
            error: sendResult.error,
          });
        }
      }
    }

    return results;
  }

  /**
   * Recurring Cron Job: Automatically runs every Sunday at 20:00 (Asia/Ho_Chi_Minh time)
   */
  @Cron('0 20 * * 0', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleAutomaticWeeklyReports() {
    this.logger.log('--- [CRON] Starting automatic weekly email reports dispatch ---');

    // Calculate current week Monday to Sunday
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);

    const sunday = new Date(now);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const startDate = formatDate(monday);
    const endDate = formatDate(sunday);

    try {
      const res = await this.sendWeeklyReports({
        startDate,
        endDate,
      });
      this.logger.log(
        `--- [CRON] Completed: Total: ${res.totalStudents}, Success: ${res.sentSuccess}, Failed: ${res.sentFailed}, Skipped: ${res.skippedNoEmail} ---`,
      );
    } catch (err: any) {
      this.logger.error(`--- [CRON] Error sending automatic weekly reports: ${err.message}`, err.stack);
    }
  }
}
