import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportSessions1787700000000 implements MigrationInterface {
  name = 'CreateSupportSessions1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enum for Support Session Status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "support_sessions_status_enum" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create support_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "class_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "teacher_id" uuid NOT NULL,
        "teaching_assistant_id" uuid NOT NULL,
        "session_date" date NOT NULL,
        "start_time" character varying(10) NOT NULL,
        "end_time" character varying(10) NOT NULL,
        "skills" text[] NOT NULL DEFAULT '{}',
        "teacher_note" text,
        "status" "support_sessions_status_enum" NOT NULL DEFAULT 'PENDING',
        "is_present" boolean,
        "absence_reason" text,
        "score" numeric(4,2),
        "ta_comment" text,
        "evaluated_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_support_sessions_class_id" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_support_sessions_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_support_sessions_teacher_id" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_support_sessions_ta_id" FOREIGN KEY ("teaching_assistant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "support_sessions";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "support_sessions_status_enum";`);
  }
}
