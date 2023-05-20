import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRelations1683429863425 implements MigrationInterface {
  name = 'AddAdminRelations1683429863425';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin" ADD "email" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD "password" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD "refreshToken" character varying(300)`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "adminId" uuid`);
    await queryRunner.query(`ALTER TABLE "event" ADD "adminId" uuid`);
    await queryRunner.query(`ALTER TABLE "calendar" ADD "adminId" uuid`);
    await queryRunner.query(`ALTER TABLE "type_event" ADD "adminId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_b7e8dbf128559c734f9ef1ee43e" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event" ADD CONSTRAINT "FK_41d633c4273528f83d3ad8465e2" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendar" ADD CONSTRAINT "FK_8889cbfa65c67257f6e52e04095" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "type_event" ADD CONSTRAINT "FK_2e86cd3175d07df4ab2bd4027c0" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "type_event" DROP CONSTRAINT "FK_2e86cd3175d07df4ab2bd4027c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendar" DROP CONSTRAINT "FK_8889cbfa65c67257f6e52e04095"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event" DROP CONSTRAINT "FK_41d633c4273528f83d3ad8465e2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_b7e8dbf128559c734f9ef1ee43e"`,
    );
    await queryRunner.query(`ALTER TABLE "type_event" DROP COLUMN "adminId"`);
    await queryRunner.query(`ALTER TABLE "calendar" DROP COLUMN "adminId"`);
    await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "adminId"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "adminId"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "refreshToken"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "password"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "email"`);
  }
}
