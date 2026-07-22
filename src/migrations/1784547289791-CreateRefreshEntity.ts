import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRefreshEntity1784547289791 implements MigrationInterface {
    name = 'CreateRefreshEntity1784547289791'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "refresh_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "user_id" uuid, CONSTRAINT "PK_81fe7136f559458fad8df7c5fb6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "refresh_entity" ADD CONSTRAINT "FK_9a327d67699bd9787193d5b47c7" FOREIGN KEY ("user_id") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_entity" DROP CONSTRAINT "FK_9a327d67699bd9787193d5b47c7"`);
        await queryRunner.query(`DROP TABLE "refresh_entity"`);
    }

}
