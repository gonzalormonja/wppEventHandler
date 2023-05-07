import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeEvent } from '../entities/type-event.entity';
import { Repository } from 'typeorm';
import { TypeEventInput } from './models/type-event.input';
import { Admin } from 'src/entities/admin.entity';

@Injectable()
export class TypeEventService {
  constructor(
    @InjectRepository(TypeEvent)
    private readonly typeEventModel: Repository<TypeEvent>,
  ) {}

  public async create(input: TypeEventInput, admin: Admin): Promise<TypeEvent> {
    const typeEvent = this.typeEventModel.create({ ...input, admin });
    return this.typeEventModel.save(typeEvent);
  }
  public async get(admin: Admin): Promise<[TypeEvent[], number]> {
    return this.typeEventModel.findAndCount({
      where: { admin: { id: admin.id } },
    });
  }
  public async getOne(id: string, admin: Admin): Promise<TypeEvent> {
    return this.typeEventModel.findOne({
      where: { id: id, admin: { id: admin.id } },
    });
  }
  public async delete(id: string, admin: Admin): Promise<void> {
    const typeEvent = await this.typeEventModel.findOne({
      where: { id: id, admin: { id: admin.id } },
    });
    await this.typeEventModel.softRemove(typeEvent);
  }
}
