import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeEvent } from 'src/entities/type-event.entity';
import { Repository } from 'typeorm';
import { TypeEventInput } from './models/type-event.input';

@Injectable()
export class TypeEventService {
  constructor(
    @InjectRepository(TypeEvent)
    private readonly typeEventModel: Repository<TypeEvent>,
  ) {}

  public async create(input: TypeEventInput): Promise<TypeEvent> {
    const typeEvent = this.typeEventModel.create(input);
    return this.typeEventModel.save(typeEvent);
  }
  public async get(): Promise<[TypeEvent[], number]> {
    return this.typeEventModel.findAndCount();
  }
  public async getOne(id: string): Promise<TypeEvent> {
    return this.typeEventModel.findOne({ where: { id: id } });
  }
  public async delete(id: string): Promise<void> {
    const typeEvent = await this.typeEventModel.findOne({ where: { id: id } });
    await this.typeEventModel.softRemove(typeEvent);
  }
}
