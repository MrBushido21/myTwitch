import { MigrationInterface, QueryRunner } from "typeorm";

export class NewChannelColumns1784893219441 implements MigrationInterface {
    name = 'NewChannelColumns1784893219441'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel_entity" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "channel_entity" ADD "baner_img_link" character varying`);
        await queryRunner.query(`ALTER TABLE "channel_entity" ADD "avatar_img_link" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel_entity" DROP COLUMN "avatar_img_link"`);
        await queryRunner.query(`ALTER TABLE "channel_entity" DROP COLUMN "baner_img_link"`);
        await queryRunner.query(`ALTER TABLE "channel_entity" DROP COLUMN "description"`);
    }

}
