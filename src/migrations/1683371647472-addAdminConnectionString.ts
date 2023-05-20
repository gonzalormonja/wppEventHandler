import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminConnectionString1683371647472
  implements MigrationInterface
{
  name = 'AddAdminConnectionString1683371647472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin" ADD "connectString" character varying(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "connectString"`);
  }
}
