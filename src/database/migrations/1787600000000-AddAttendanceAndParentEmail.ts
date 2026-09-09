import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceAndParentEmail1787600000000 implements MigrationInterface {
  name = 'AddAttendanceAndParentEmail1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add parent_email column to students table
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD COLUMN IF NOT EXISTS "parent_email" character varying(255);
    `);

    // 2. Create class_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "class_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "class_id" uuid NOT NULL,
        "session_date" date NOT NULL,
        "start_time" character varying(10),
        "end_time" character varying(10),
        "topic" text,
        "teacher_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_class_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_class_sessions_class_id" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_class_sessions_teacher_id" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    // 3. Create attendance_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "is_present" boolean NOT NULL DEFAULT true,
        "reason" text,
        "score" numeric(4,2),
        "comment" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_records_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attendance_records_session_student" UNIQUE ("session_id", "student_id"),
        CONSTRAINT "FK_attendance_records_session_id" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_attendance_records_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_records";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_sessions";`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "parent_email";`);
  }
}
