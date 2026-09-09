import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { ClassStudent } from '../enrollments/entities/class-student.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { SupportSession } from '../support-sessions/entities/support-session.entity';
import { paginate, FilterOperator } from 'nestjs-paginate';
import type { PaginateConfig, PaginateQuery, Paginated } from 'nestjs-paginate';

export const studentsPaginateConfig: PaginateConfig<Student> = {
  sortableColumns: ['id', 'fullName', 'phone', 'email', 'parentEmail', 'gender', 'status', 'createdAt'],
  defaultSortBy: [['createdAt', 'DESC']],
  searchableColumns: ['fullName', 'phone', 'email', 'parentEmail'],
  filterableColumns: {
    status: [FilterOperator.EQ, FilterOperator.IN],
    gender: [FilterOperator.EQ],
    'enrollments.classId': [FilterOperator.EQ, FilterOperator.IN],
    'enrollments.class.teacherId': [FilterOperator.EQ],
  },
  maxLimit: 100,
  defaultLimit: 10,
};

export interface IStudentEvaluationItem {
  id: string;
  type: 'MAIN_CLASS' | 'SUPPORT_SESSION';
  sessionDate: string; // YYYY-MM-DD
  displayDate: string; // DD/MM/YYYY
  dayOfWeekName: string; // Thứ 2 ...
  startTime?: string;
  endTime?: string;
  classId?: string;
  className?: string;
  classCode?: string;
  evaluatorName?: string;
  evaluatorRole: 'TEACHER' | 'TEACHING_ASSISTANT';
  isPresent: boolean;
  absenceReason?: string | null;
  score?: number | null;
  comment?: string | null;
  // Main class details
  topic?: string | null;
  homework?: string | null;
  lessonNotes?: string | null;
  materialsUrl?: string | null;
  // Support session details
  skills?: string[];
  teacherNote?: string | null;
  status?: string;
}

export interface IStudentWeeklyEvaluationGroup {
  weekKey: string; // YYYY-MM-DD of Monday
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weekLabel: string; // Tuần: DD/MM/YYYY - DD/MM/YYYY
  totalSessions: number;
  mainSessionsCount: number;
  supportSessionsCount: number;
  presentCount: number;
  absentCount: number;
  avgScore: number | null;
  sessions: IStudentEvaluationItem[];
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(ClassStudent)
    private classStudentsRepository: Repository<ClassStudent>,
    @InjectRepository(AttendanceRecord)
    private attendanceRecordsRepository: Repository<AttendanceRecord>,
    @InjectRepository(SupportSession)
    private supportSessionsRepository: Repository<SupportSession>,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    const { classId, ...studentData } = createStudentDto;

    const student = this.studentsRepository.create(studentData);
    const savedStudent = await this.studentsRepository.save(student);

    if (classId) {
      const enrollment = this.classStudentsRepository.create({
        classId,
        studentId: savedStudent.id,
      });
      await this.classStudentsRepository.save(enrollment);
    }

    return this.findOne(savedStudent.id);
  }

  async findAll(query: PaginateQuery, currentUser?: User): Promise<Paginated<Student>> {
    const queryBuilder = this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.enrollments', 'enrollments')
      .leftJoinAndSelect('enrollments.class', 'class')
      .leftJoinAndSelect('class.teacher', 'teacher');

    return paginate(query, queryBuilder, studentsPaginateConfig);
  }

  async findOne(id: string, currentUser?: User) {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: {
        enrollments: {
          class: {
            teacher: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy học viên với id ${id}`);
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, currentUser?: User) {
    const student = await this.findOne(id, currentUser);

    // If teacher, only allow updating students enrolled in their class
    if (currentUser && currentUser.role === Role.TEACHER) {
      const isEnrolledInTeacherClass = student.enrollments?.some(
        (e) => e.class?.teacherId === currentUser.id,
      );
      if (!isEnrolledInTeacherClass) {
        throw new ForbiddenException(
          'Bạn chỉ có thể chỉnh sửa thông tin học viên đang theo học tại lớp do mình phụ trách',
        );
      }
    }

    if (updateStudentDto.fullName !== undefined) student.fullName = updateStudentDto.fullName;
    if (updateStudentDto.phone !== undefined) student.phone = updateStudentDto.phone;
    if (updateStudentDto.email !== undefined) student.email = updateStudentDto.email;
    if (updateStudentDto.parentEmail !== undefined) student.parentEmail = updateStudentDto.parentEmail;
    if (updateStudentDto.gender !== undefined) student.gender = updateStudentDto.gender;
    if (updateStudentDto.status !== undefined) student.status = updateStudentDto.status;
    if (updateStudentDto.notes !== undefined) student.notes = updateStudentDto.notes;

    return this.studentsRepository.save(student);
  }

  async remove(id: string) {
    const student = await this.findOne(id);
    await this.studentsRepository.remove(student);
    return { success: true, id };
  }

  /**
   * Lấy toàn bộ sổ theo dõi & đánh giá của học viên theo từng buổi học (chia theo tuần)
   * Bao gồm cả đánh giá từ giáo viên (ca chính khóa) và đánh giá từ trợ giảng (ca support 1-1)
   */
  async getStudentEvaluations(studentId: string, currentUser?: User) {
    const student = await this.findOne(studentId, currentUser);

    // Phân quyền cho Giáo viên: Chỉ được xem học viên thuộc lớp do giáo viên này dạy
    if (currentUser && currentUser.role === Role.TEACHER) {
      const isEnrolledInTeacherClass = student.enrollments?.some(
        (e) => e.class?.teacherId === currentUser.id,
      );
      if (!isEnrolledInTeacherClass) {
        throw new ForbiddenException(
          'Bạn chỉ có thể xem đánh giá học tập của học viên đang theo học tại lớp do mình phụ trách',
        );
      }
    }

    // 1. Lấy tất cả lịch sử điểm danh & đánh giá từ ca chính khóa
    const attendanceRecords = await this.attendanceRecordsRepository.find({
      where: { studentId },
      relations: {
        session: {
          class: {
            teacher: true,
          },
          teacher: true,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });

    // 2. Lấy tất cả lịch sử ca hỗ trợ 1-1 từ Trợ giảng
    const supportSessions = await this.supportSessionsRepository.find({
      where: { studentId },
      relations: {
        class: true,
        teacher: true,
        teachingAssistant: true,
      },
      order: {
        sessionDate: 'ASC',
      },
    });

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // 3. Chuẩn hóa danh sách các buổi đánh giá
    const evaluationItems: IStudentEvaluationItem[] = [];

    // Thêm các ca chính khóa
    for (const att of attendanceRecords) {
      if (!att.session) continue;
      const rawDate = att.session.sessionDate;
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate).toISOString().split('T')[0];
      const d = new Date(dateStr);
      const [year, month, day] = dateStr.split('-');
      const displayDate = `${day}/${month}/${year}`;
      const dayOfWeekName = dayNames[d.getDay()] || 'T2';

      const scoreNum = att.score !== null && att.score !== undefined && !isNaN(Number(att.score))
        ? Number(att.score)
        : null;

      evaluationItems.push({
        id: att.id,
        type: 'MAIN_CLASS',
        sessionDate: dateStr,
        displayDate,
        dayOfWeekName,
        startTime: att.session.startTime,
        endTime: att.session.endTime,
        classId: att.session.class?.id,
        className: att.session.class?.name,
        classCode: att.session.class?.code,
        evaluatorName: att.session.teacher?.fullName || att.session.class?.teacher?.fullName || 'Giáo viên',
        evaluatorRole: 'TEACHER',
        isPresent: att.isPresent,
        absenceReason: att.reason,
        score: scoreNum,
        comment: att.comment,
        topic: att.session.topic,
        homework: att.session.homework,
        lessonNotes: att.session.lessonNotes,
        materialsUrl: att.session.materialsUrl,
      });
    }

    // Thêm các ca support của Trợ giảng
    for (const sup of supportSessions) {
      const rawDate = sup.sessionDate;
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate).toISOString().split('T')[0];
      const d = new Date(dateStr);
      const [year, month, day] = dateStr.split('-');
      const displayDate = `${day}/${month}/${year}`;
      const dayOfWeekName = dayNames[d.getDay()] || 'T2';

      const scoreNum = sup.score !== null && sup.score !== undefined && !isNaN(Number(sup.score))
        ? Number(sup.score)
        : null;

      evaluationItems.push({
        id: sup.id,
        type: 'SUPPORT_SESSION',
        sessionDate: dateStr,
        displayDate,
        dayOfWeekName,
        startTime: sup.startTime,
        endTime: sup.endTime,
        classId: sup.class?.id,
        className: sup.class?.name,
        classCode: sup.class?.code,
        evaluatorName: sup.teachingAssistant?.fullName || 'Trợ giảng',
        evaluatorRole: 'TEACHING_ASSISTANT',
        isPresent: sup.isPresent ?? true,
        absenceReason: sup.absenceReason,
        score: scoreNum,
        comment: sup.taComment,
        skills: sup.skills || [],
        teacherNote: sup.teacherNote,
        status: sup.status,
      });
    }

    // 4. Gom nhóm theo ISO Week (Thứ 2 -> Chủ Nhật)
    const weekMap = new Map<string, IStudentEvaluationItem[]>();

    const getMondayOfDate = (dateStr: string): string => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const day = dt.getUTCDay();
      // day: 0 (Sun), 1 (Mon), ..., 6 (Sat)
      const diff = dt.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(dt.setDate(diff));
      return monday.toISOString().split('T')[0];
    };

    const getSundayOfMonday = (mondayStr: string): string => {
      const [y, m, d] = mondayStr.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() + 6);
      return dt.toISOString().split('T')[0];
    };

    for (const item of evaluationItems) {
      const mondayStr = getMondayOfDate(item.sessionDate);
      if (!weekMap.has(mondayStr)) {
        weekMap.set(mondayStr, []);
      }
      weekMap.get(mondayStr)!.push(item);
    }

    // 5. Tính toán thống kê theo từng tuần
    const weeklyEvaluations: IStudentWeeklyEvaluationGroup[] = [];

    for (const [mondayStr, sessions] of weekMap.entries()) {
      const sundayStr = getSundayOfMonday(mondayStr);
      const [mY, mM, mD] = mondayStr.split('-');
      const [sY, sM, sD] = sundayStr.split('-');
      const weekLabel = `Tuần: ${mD}/${mM}/${mY} - ${sD}/${sM}/${sY}`;

      // Sắp xếp các buổi trong tuần theo thứ tự thời gian tăng dần
      sessions.sort((a, b) => {
        const dateCmp = a.sessionDate.localeCompare(b.sessionDate);
        if (dateCmp !== 0) return dateCmp;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

      const totalSessions = sessions.length;
      const mainSessionsCount = sessions.filter((s) => s.type === 'MAIN_CLASS').length;
      const supportSessionsCount = sessions.filter((s) => s.type === 'SUPPORT_SESSION').length;
      const presentCount = sessions.filter((s) => s.isPresent).length;
      const absentCount = totalSessions - presentCount;

      const scored = sessions.filter((s) => s.score !== null && s.score !== undefined);
      const avgScore =
        scored.length > 0
          ? Number((scored.reduce((sum, s) => sum + Number(s.score), 0) / scored.length).toFixed(1))
          : null;

      weeklyEvaluations.push({
        weekKey: mondayStr,
        startDate: mondayStr,
        endDate: sundayStr,
        weekLabel,
        totalSessions,
        mainSessionsCount,
        supportSessionsCount,
        presentCount,
        absentCount,
        avgScore,
        sessions,
      });
    }

    // Sắp xếp các tuần theo thứ tự giảm dần (tuần mới nhất lên đầu)
    weeklyEvaluations.sort((a, b) => b.weekKey.localeCompare(a.weekKey));

    // 6. Tính toán thống kê tổng quan toàn khóa của học viên
    const totalMainSessions = evaluationItems.filter((i) => i.type === 'MAIN_CLASS').length;
    const totalSupportSessions = evaluationItems.filter((i) => i.type === 'SUPPORT_SESSION').length;
    const totalAllSessions = evaluationItems.length;
    const totalPresent = evaluationItems.filter((i) => i.isPresent).length;
    const totalAbsent = totalAllSessions - totalPresent;
    const overallAttendanceRate =
      totalAllSessions > 0 ? Math.round((totalPresent / totalAllSessions) * 100) : 100;

    const allScored = evaluationItems.filter((i) => i.score !== null && i.score !== undefined);
    const overallAvgScore =
      allScored.length > 0
        ? Number((allScored.reduce((sum, i) => sum + Number(i.score), 0) / allScored.length).toFixed(1))
        : null;

    // Danh sách các lớp học viên đã ghi danh
    const enrolledClasses = (student.enrollments || []).map((e) => ({
      id: e.class?.id,
      code: e.class?.code,
      name: e.class?.name,
      level: e.class?.level,
      teacherName: e.class?.teacher?.fullName,
    })).filter((c) => Boolean(c.id));

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        parentEmail: student.parentEmail,
        status: student.status,
      },
      summary: {
        totalAllSessions,
        totalMainSessions,
        totalSupportSessions,
        totalPresent,
        totalAbsent,
        overallAttendanceRate,
        overallAvgScore,
      },
      enrolledClasses,
      weeklyEvaluations,
    };
  }
}

