import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeEventDatesType1682134649946 implements MigrationInterface {
  name = 'ChangeEventDatesType1682134649946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "startDateTime"`);
    await queryRunner.query(
      `ALTER TABLE "event" ADD "startDateTime" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "endDateTime"`);
    await queryRunner.query(
      `ALTER TABLE "event" ADD "endDateTime" TIMESTAMP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "endDateTime"`);
    await queryRunner.query(
      `ALTER TABLE "event" ADD "endDateTime" date NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "startDateTime"`);
    await queryRunner.query(
      `ALTER TABLE "event" ADD "startDateTime" date NOT NULL`,
    );
  }
}
