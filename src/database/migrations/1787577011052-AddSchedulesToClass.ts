import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSchedulesToClass1787577011052 implements MigrationInterface {
    name = 'AddSchedulesToClass1787577011052'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "schedules" jsonb DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN IF EXISTS "schedules"`);
    }
}
