import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from '../entities/admin.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin) private readonly adminModel: Repository<Admin>,
  ) {}
  public async getAdmins(): Promise<Admin[]> {
    return this.adminModel.find();
  }
  public async getOne(id: string): Promise<Admin> {
    return this.adminModel.findOne({ where: { id } });
  }
  public async getOneBy(column: string, value: string): Promise<Admin> {
    return this.adminModel.findOne({ where: { [column]: value } });
  }
  public async addWppId(adminId: string, wppId: string): Promise<void> {
    await this.adminModel.update({ id: adminId }, { wppId });
  }
  public async updateRefreshToken(
    adminId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.adminModel.update({ id: adminId }, { refreshToken });
  }
}
