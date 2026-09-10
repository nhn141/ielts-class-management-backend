import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface ISessionReportItem {
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  isPresent: boolean;
  reason?: string;
  score?: number | null;
  comment?: string | null;
}

export interface ISupportReportItem {
  id?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  skills: string[];
  isPresent: boolean;
  absenceReason?: string;
  score?: number | null;
  taComment?: string;
  taName: string;
  teacherNote?: string;
}

export interface ISendWeeklyReportDto {
  student: {
    fullName: string;
    email?: string;
    parentEmail?: string;
  };
  className: string;
  teacherName: string;
  weekRange: {
    start: string;
    end: string;
  };
  records: ISessionReportItem[];
  supportRecords?: ISupportReportItem[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private resendApiKey: string | null = null;
  private brevoApiKey: string | null = null;

  constructor(private configService: ConfigService) {
    this.initMailClient();
  }

  private initMailClient() {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || null;
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') || null;

    if (this.brevoApiKey) {
      this.logger.log('Brevo HTTPS API (Port 443) configured for sending emails.');
    }

    if (this.resendApiKey) {
      this.logger.log('Resend HTTPS API (Port 443) configured for sending emails.');
    }

    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 465);
    const secure = this.configService.get<string>('SMTP_SECURE', 'true') === 'true' || Number(port) === 465;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.logger.log(`SMTP Transporter configured for host: ${host}:${port} (${user})`);
    } else if (!this.resendApiKey && !this.brevoApiKey) {
      this.logger.warn(
        'Neither BREVO_API_KEY, RESEND_API_KEY nor SMTP configurations provided in .env. Emails will be simulated.',
      );
    }
  }

  private sanitizeMailFrom(rawFrom?: string): string {
    let from = (rawFrom || '').trim();
    if (!from) {
      return 'Thầy Thành IELTS <onboarding@resend.dev>';
    }
    // Remove outer quotes if wrapped like "Name <email>" or 'Name <email>'
    while (
      (from.startsWith('"') && from.endsWith('"')) ||
      (from.startsWith("'") && from.endsWith("'"))
    ) {
      from = from.slice(1, -1).trim();
    }
    // If it's just an email e.g. "onboarding@resend.dev", wrap with default name
    if (from.includes('@') && !from.includes('<')) {
      return `Thầy Thành IELTS <${from}>`;
    }
    return from;
  }

  /**
   * Helper to format attendance status label and color badge
   */
  private getAttendanceBadge(record: ISessionReportItem): { label: string; color: string; bg: string } {
    if (record.isPresent) {
      return { label: 'Có mặt', color: '#1677ff', bg: '#e6f4ff' };
    }
    if (record.reason && record.reason.trim().length > 0) {
      return { label: `Vắng có phép (${record.reason.trim()})`, color: '#fa8c16', bg: '#fff7e6' };
    }
    return { label: 'Vắng không phép', color: '#cf1322', bg: '#fff1f0' };
  }

  /**
   * Build beautiful HTML email template for Weekly Learning Report
   */
  private buildWeeklyReportHtml(data: ISendWeeklyReportDto): string {
    const { student, className, teacherName, weekRange, records } = data;

    const totalSessions = records.length;
    const presentSessions = records.filter((r) => r.isPresent).length;
    const absentSessions = totalSessions - presentSessions;

    const scoredRecords = records.filter((r) => r.score !== null && r.score !== undefined && !isNaN(Number(r.score)));
    const avgScore =
      scoredRecords.length > 0
        ? (scoredRecords.reduce((sum, r) => sum + Number(r.score), 0) / scoredRecords.length).toFixed(1)
        : 'N/A';

    const sessionRowsHtml = records
      .map((r, index) => {
        const badge = this.getAttendanceBadge(r);
        const scoreDisplay =
          r.score !== null && r.score !== undefined && !isNaN(Number(r.score))
            ? `<span style="display:inline-block; padding: 3px 8px; background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; border-radius: 4px; font-weight: bold;">${Number(r.score)} / 10</span>`
            : '<span style="color: #8c8c8c;">-</span>';

        const commentDisplay = r.comment && r.comment.trim() ? r.comment : '<i style="color: #bfbfbf;">Không có nhận xét</i>';

        const timeSlot = r.startTime && r.endTime ? `<div style="font-size: 12px; color: #8c8c8c;">${r.startTime} - ${r.endTime}</div>` : '';
        const topicDisplay = r.topic ? `<div style="font-size: 12px; color: #595959; margin-top: 2px;"><i>Bài: ${r.topic}</i></div>` : '';

        return `
          <tr style="border-bottom: 1px solid #f0f0f0; ${index % 2 === 1 ? 'background-color: #fafafa;' : ''}">
            <td style="padding: 12px; font-size: 13px; color: #262626;">
              <strong>${r.sessionDate}</strong>
              ${timeSlot}
              ${topicDisplay}
            </td>
            <td style="padding: 12px; font-size: 13px;">
              <span style="display:inline-block; padding: 4px 10px; background: ${badge.bg}; color: ${badge.color}; border-radius: 4px; font-weight: 500; font-size: 12px;">
                ${badge.label}
              </span>
            </td>
            <td style="padding: 12px; font-size: 13px; text-align: center;">
              ${scoreDisplay}
            </td>
            <td style="padding: 12px; font-size: 13px; color: #595959;">
              ${commentDisplay}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Báo Cáo Học Tập Tuần - Thầy Thành IELTS</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333;">
        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">THẦY THÀNH IELTS</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">BÁO CÁO KẾT QUẢ HỌC TẬP & ĐIỂM DANH HÀNG TUẦN</p>
            <div style="display: inline-block; margin-top: 10px; padding: 4px 14px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 12px; font-weight: 600;">
              Tuần: ${weekRange.start} đến ${weekRange.end}
            </div>
          </div>

          <!-- Student & Class info -->
          <div style="padding: 20px 24px; background: #fcfcfd; border-bottom: 1px solid #f0f0f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #8c8c8c; width: 120px;">Học viên:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #1f1f1f; font-size: 15px;">${student.fullName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #8c8c8c;">Lớp học:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #1677ff;">${className}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #8c8c8c;">Giáo viên:</td>
                <td style="padding: 4px 0; color: #262626;">${teacherName || 'Thầy Thành'}</td>
              </tr>
            </table>
          </div>

          <!-- Summary Metric Cards -->
          <div style="padding: 20px 24px;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
              <tr>
                <td style="background: #f0f5ff; border: 1px solid #d6e4ff; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
                  <div style="font-size: 12px; color: #595959;">Tổng ca học</div>
                  <div style="font-size: 20px; font-weight: 700; color: #1677ff; margin-top: 4px;">${totalSessions}</div>
                </td>
                <td style="background: #f6ffed; border: 1px solid #d9f7be; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
                  <div style="font-size: 12px; color: #595959;">Có mặt</div>
                  <div style="font-size: 20px; font-weight: 700; color: #389e0d; margin-top: 4px;">${presentSessions}</div>
                </td>
                <td style="background: #fff1f0; border: 1px solid #ffccc7; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
                  <div style="font-size: 12px; color: #595959;">Vắng</div>
                  <div style="font-size: 20px; font-weight: 700; color: #cf1322; margin-top: 4px;">${absentSessions}</div>
                </td>
                <td style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
                  <div style="font-size: 12px; color: #595959;">Điểm TB tuần</div>
                  <div style="font-size: 20px; font-weight: 700; color: #d48806; margin-top: 4px;">${avgScore}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Detailed Sessions Table -->
          <div style="padding: 0 24px 24px 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #262626; border-left: 4px solid #1677ff; padding-left: 8px;">
              Chi Tiết Đánh Giá Từng Ca Học Trong Tuần
            </h3>

            ${
              records.length === 0
                ? '<p style="color: #8c8c8c; font-style: italic; text-align: center; padding: 20px 0;">Không có ca học chính khóa nào được ghi nhận trong tuần này.</p>'
                : `
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #f0f0f0; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background: #fafafa; border-bottom: 2px solid #e8e8e8; text-align: left;">
                    <th style="padding: 10px 12px; font-size: 12px; color: #595959; width: 25%;">Ca học</th>
                    <th style="padding: 10px 12px; font-size: 12px; color: #595959; width: 28%;">Chuyên cần</th>
                    <th style="padding: 10px 12px; font-size: 12px; color: #595959; width: 15%; text-align: center;">Điểm số</th>
                    <th style="padding: 10px 12px; font-size: 12px; color: #595959; width: 32%;">Nhận xét của Giáo viên</th>
                  </tr>
                </thead>
                <tbody>
                  ${sessionRowsHtml}
                </tbody>
              </table>
            `
            }
          </div>

          ${
            data.supportRecords && data.supportRecords.length > 0
              ? `
          <!-- Support Sessions by TA -->
          <div style="padding: 0 24px 24px 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #722ed1; border-left: 4px solid #722ed1; padding-left: 8px;">
              Ca Bổ Trợ & Đánh Giá Từ Trợ Giảng (1-1 Support)
            </h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #f0f0f0; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #f9f0ff; border-bottom: 2px solid #d3adf7; text-align: left;">
                  <th style="padding: 10px 12px; font-size: 12px; color: #531dab; width: 25%;">Ca hỗ trợ</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #531dab; width: 25%;">Kĩ năng & Trợ giảng</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #531dab; width: 15%; text-align: center;">Điểm số</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #531dab; width: 35%;">Đánh giá & Nhận xét của Trợ giảng</th>
                </tr>
              </thead>
              <tbody>
                ${data.supportRecords
                  .map((sr, idx) => {
                    const scoreDisplay =
                      sr.score !== null && sr.score !== undefined && !isNaN(Number(sr.score))
                        ? `<span style="display:inline-block; padding: 3px 8px; background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; border-radius: 4px; font-weight: bold;">${Number(sr.score)} / 10</span>`
                        : '<span style="color: #8c8c8c;">-</span>';
                    const skillsBadge = (sr.skills || [])
                      .map(
                        (sk) =>
                          `<span style="display:inline-block; font-size: 11px; padding: 2px 6px; background: #efdbff; color: #531dab; border-radius: 4px; margin-right: 4px; margin-bottom: 2px;">${sk.toUpperCase()}</span>`,
                      )
                      .join('');
                    const comment = sr.taComment ? sr.taComment : '<i style="color: #bfbfbf;">Không có nhận xét</i>';

                    return `
                      <tr style="border-bottom: 1px solid #f0f0f0; ${idx % 2 === 1 ? 'background-color: #fafafa;' : ''}">
                        <td style="padding: 10px 12px; font-size: 13px; color: #262626;">
                          <strong>${sr.sessionDate}</strong>
                          <div style="font-size: 12px; color: #8c8c8c;">${sr.startTime} - ${sr.endTime}</div>
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px;">
                          <div>${skillsBadge}</div>
                          <div style="font-size: 12px; color: #595959; margin-top: 3px;">TG: <strong>${sr.taName}</strong></div>
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; text-align: center;">
                          ${scoreDisplay}
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; color: #595959;">
                          ${comment}
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
          `
              : ''
          }

          <!-- Footer -->
          <div style="background: #fafafa; padding: 18px 24px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #8c8c8c;">
            <p style="margin: 0 0 4px 0;">Báo cáo được gửi tự động định kỳ hàng tuần từ Hệ thống Quản lý <strong>Thầy Thành IELTS</strong>.</p>
            <p style="margin: 0;">Mọi thắc mắc về tình hình học tập, xin vui lòng liên hệ trực tiếp với Thầy Thành hoặc Giáo viên phụ trách.</p>
          </div>

        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send Weekly Report email via Resend HTTPS API (Port 443) or SMTP
   */
  async sendWeeklyReportMail(data: ISendWeeklyReportDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const recipients: string[] = [];

    if (data.student.email && data.student.email.trim()) {
      recipients.push(data.student.email.trim());
    }

    if (data.student.parentEmail && data.student.parentEmail.trim()) {
      recipients.push(data.student.parentEmail.trim());
    }

    if (recipients.length === 0) {
      this.logger.warn(`No email found for student ${data.student.fullName}, skipping mail sending.`);
      return { success: false, error: 'Không tìm thấy địa chỉ email của học viên hoặc phụ huynh' };
    }

    const rawMailFrom = this.configService.get<string>(
      'MAIL_FROM',
      'Thầy Thành IELTS <onboarding@resend.dev>',
    );
    const mailFrom = this.sanitizeMailFrom(rawMailFrom);
    const subject = `[Thầy Thành IELTS] Báo Cáo Học Tập Tuần (${data.weekRange.start} - ${data.weekRange.end}) - Học viên: ${data.student.fullName}`;
    const html = this.buildWeeklyReportHtml(data);

    // 1. If BREVO_API_KEY is configured, send via Brevo HTTPS REST API (Port 443 - Never blocked, no domain needed)
    if (this.brevoApiKey) {
      try {
        let senderName = 'Thầy Thành IELTS';
        let senderEmail = 'nguyenhuunghi141@gmail.com';
        const match = mailFrom.match(/^(.*?)\s*<(.+?)>$/);
        if (match) {
          senderName = match[1].trim();
          senderEmail = match[2].trim();
        } else if (mailFrom.includes('@')) {
          senderEmail = mailFrom.trim();
        }

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: recipients.map((email) => ({ email })),
            subject,
            htmlContent: html,
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || JSON.stringify(resData));
        }

        this.logger.log(`Weekly report email sent via Brevo API to ${recipients.join(', ')} (Message ID: ${resData.messageId})`);
        return { success: true, messageId: resData.messageId };
      } catch (error: any) {
        this.logger.error(`Brevo API send failed to ${recipients.join(', ')}: ${error.message}`);
        return { success: false, error: error.message };
      }
    }

    // 2. If RESEND_API_KEY is configured, send via Resend HTTPS API (Port 443 - Never blocked by ISPs)
    if (this.resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: mailFrom,
            to: recipients,
            subject,
            html,
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || JSON.stringify(resData));
        }

        this.logger.log(`Weekly report email sent via Resend API to ${recipients.join(', ')} (ID: ${resData.id})`);
        return { success: true, messageId: resData.id };
      } catch (error: any) {
        this.logger.error(`Resend API send failed to ${recipients.join(', ')}: ${error.message}`);
        
        // If SMTP is also configured, attempt fallback to SMTP
        if (this.transporter) {
          this.logger.warn(`Attempting fallback to SMTP for recipients: ${recipients.join(', ')}...`);
          try {
            const info = await this.transporter.sendMail({
              from: mailFrom,
              to: recipients,
              subject,
              html,
            });
            this.logger.log(`Weekly report email sent via SMTP fallback to ${recipients.join(', ')} (Message ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId };
          } catch (smtpErr: any) {
            this.logger.error(`SMTP fallback also failed: ${smtpErr.message}`);
          }
        }

        return { success: false, error: error.message };
      }
    }

    // 2. If SMTP is configured, send via SMTP
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: mailFrom,
          to: recipients,
          subject,
          html,
        });

        this.logger.log(`Weekly report email sent via SMTP to ${recipients.join(', ')} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (error: any) {
        this.logger.error(`SMTP send failed to ${recipients.join(', ')}: ${error.message}`);
        return { success: false, error: error.message };
      }
    }

    // 3. Fallback: Simulation mode
    this.logger.warn(`[SIMULATE MAIL] To: ${recipients.join(', ')} | Subject: ${subject}`);
    return { success: true, messageId: 'simulated-id' };
  }
}
