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
}