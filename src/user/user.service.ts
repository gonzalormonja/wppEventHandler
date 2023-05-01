import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UserInput } from './models/user.input';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userModel: Repository<User>,
  ) {}
  public async create(userInput: UserInput): Promise<User> {
    const user = this.userModel.create({
      ...userInput,
    });
    return this.userModel.save(user);
  }
  public async getOne(id: string): Promise<User> {
    return this.userModel.findOne({ where: { id } });
  }

  public async getOneBy(column: string, value: string): Promise<User> {
    return this.userModel.findOne({ where: { [column]: value } });
  }
}
