import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class InitialSchema1708600000000 implements MigrationInterface {
  name = 'InitialSchema1708600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM ('SUPER_ADMIN', 'TEACHER', 'TEACHING_ASSISTANT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "classes_level_enum" AS ENUM ('BASIC', 'ADVANCED_LS', 'ADVANCED_RW', 'TEST_PRACTICE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "classes_status_enum" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "students_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'DROPPED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "class_students_status_enum" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Table: users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "full_name" character varying(255) NOT NULL,
        "phone" character varying(50),
        "gender" "users_gender_enum" NOT NULL DEFAULT 'OTHER',
        "role" "users_role_enum" NOT NULL DEFAULT 'TEACHER',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);

    // 4. Table: classes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "classes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "code" character varying(100) NOT NULL,
        "level" "classes_level_enum" NOT NULL DEFAULT 'BASIC',
        "note" text,
        "teacher_id" uuid,
        "start_date" date,
        "end_date" date,
        "status" "classes_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_classes_code" UNIQUE ("code"),
        CONSTRAINT "PK_classes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_classes_teacher_id" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    // 5. Table: students
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "full_name" character varying(255) NOT NULL,
        "phone" character varying(50),
        "email" character varying(255),
        "gender" "users_gender_enum" DEFAULT 'OTHER',
        "status" "students_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_students_id" PRIMARY KEY ("id")
      );
    `);

    // 6. Table: class_students (Enrollment)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "class_students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "class_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "enrolled_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "status" "class_students_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "note" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_class_students_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_class_students_class_student" UNIQUE ("class_id", "student_id"),
        CONSTRAINT "FK_class_students_class_id" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_class_students_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    // 7. Seed Initial Super Admin user
    const defaultPasswordHash = await bcrypt.hash('admin123456', 10);
    await queryRunner.query(`
      INSERT INTO "users" ("email", "password", "full_name", "phone", "gender", "role", "is_active")
      VALUES ('admin@ielts.local', '${defaultPasswordHash}', 'Super Admin', '0901234567', 'MALE', 'SUPER_ADMIN', true)
      ON CONFLICT ("email") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "class_students";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "students";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "classes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "class_students_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "students_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "classes_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "classes_level_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_gender_enum";`);
  }
}
