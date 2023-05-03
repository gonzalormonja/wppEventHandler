import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypeEvent1683118563424 implements MigrationInterface {
    name = 'AddTypeEvent1683118563424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "type_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying(255) NOT NULL, "durationInMinutes" integer NOT NULL, CONSTRAINT "PK_260880032a00f9cf26b748d3fc8" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "type_event"`);
    }

}
