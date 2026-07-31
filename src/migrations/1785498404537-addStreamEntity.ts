import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStreamEntity1785498404537 implements MigrationInterface {
    name = 'AddStreamEntity1785498404537'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stream_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ended_at" TIMESTAMP WITH TIME ZONE, "peak_viewers" integer NOT NULL DEFAULT '0', "channel_id" uuid, CONSTRAINT "PK_e8fb6b05bbe7395ba853d6b5413" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_channel_online" ON "channel_entity"  ("online_status") WHERE "online_status" = 'online'`);
        await queryRunner.query(`ALTER TABLE "stream_entity" ADD CONSTRAINT "FK_a798d4c10aea292d8acf9eae85b" FOREIGN KEY ("channel_id") REFERENCES "channel_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stream_entity" DROP CONSTRAINT "FK_a798d4c10aea292d8acf9eae85b"`);
        await queryRunner.query(`DROP INDEX "public"."idx_channel_online"`);
        await queryRunner.query(`DROP TABLE "stream_entity"`);
    }

}
