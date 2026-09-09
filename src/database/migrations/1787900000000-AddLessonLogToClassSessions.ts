import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLessonLogToClassSessions1787900000000 implements MigrationInterface {
  name = 'AddLessonLogToClassSessions1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "class_sessions"
      ADD COLUMN IF NOT EXISTS "homework" text,
      ADD COLUMN IF NOT EXISTS "lesson_notes" text,
      ADD COLUMN IF NOT EXISTS "materials_url" character varying(500);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "class_sessions"
      DROP COLUMN IF EXISTS "homework",
      DROP COLUMN IF EXISTS "lesson_notes",
      DROP COLUMN IF EXISTS "materials_url";
    `);
  }
}
