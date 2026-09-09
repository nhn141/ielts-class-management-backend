import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1787800000000 implements MigrationInterface {
  name = 'CreateNotifications1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "type" character varying(100) NOT NULL DEFAULT 'SUPPORT_REQUEST',
        "link" character varying(500),
        "is_read" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_is_read" ON "notifications" ("user_id", "is_read");
      CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON "notifications" ("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
  }
}
