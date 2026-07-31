import { MigrationInterface, QueryRunner } from "typeorm";

export class StreamTitleInChannelsEntity1785503199077 implements MigrationInterface {
    name = 'StreamTitleInChannelsEntity1785503199077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stream_entity" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "channel_entity" ADD "stream_title" character varying NOT NULL DEFAULT 'stream'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel_entity" DROP COLUMN "stream_title"`);
        await queryRunner.query(`ALTER TABLE "stream_entity" ADD "title" character varying NOT NULL`);
    }

}
