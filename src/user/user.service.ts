import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { UserInput } from './models/user.input';
import { Admin } from 'src/entities/admin.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userModel: Repository<User>,
  ) {}
  public async create(userInput: UserInput, admin: Admin): Promise<User> {
    const user = this.userModel.create({
      ...userInput,
      admin,
    });
    return this.userModel.save(user);
  }
  public async getOne(id: string, admin: Admin): Promise<User> {
    return this.userModel.findOne({ where: { id, admin: { id: admin.id } } });
  }

  public async getOneBy(
    column: string,
    value: string,
    admin: Admin,
  ): Promise<User> {
    return this.userModel.findOne({
      where: { [column]: value, admin: { id: admin.id } },
    });
  }
}
