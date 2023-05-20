import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStartAndEndDateTimeInEvent1682132247297
  implements MigrationInterface
{
  name = 'AddStartAndEndDateTimeInEvent1682132247297';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "dateTime"`);
    await queryRunner.query(
      `ALTER TABLE "event" ADD "startDateTime" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "event" ADD "endDateTime" date NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "endDateTime"`);
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "startDateTime"`);
    await queryRunner.query(`ALTER TABLE "event" ADD "dateTime" date NOT NULL`);
  }
}
