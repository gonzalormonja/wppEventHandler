import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminTable1683076090465 implements MigrationInterface {
    name = 'AddAdminTable1683076090465'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "admin" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "wppId" character varying(255), "name" character varying(255) NOT NULL, "sessionPath" character varying(255) NOT NULL, CONSTRAINT "UQ_2742047fb91984caaf314e00f36" UNIQUE ("sessionPath"), CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "admin"`);
    }

}
