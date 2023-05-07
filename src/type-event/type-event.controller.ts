import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { TypeEventInput } from './models/type-event.input';
import { TypeEvent } from '../entities/type-event.entity';
import { TypeEventService } from './type-event.service';
import { TypeEventOutput } from './models/type-event.output';
import { VoidOutput } from '../models/void.output';
import { UuidValidator } from '../interceptors/uuid.validator';
import { TypeEventsOutput } from './models/type-events.output';
import { DecodedToken as DecodedTokenInterface } from 'src/models/decodedToken.interface';

@ApiBearerAuth()
@ApiTags('TypeEvent')
@Controller('type-event')
export class TypeEventController {
  constructor(private readonly typeEventService: TypeEventService) {}

  @Post()
  @Serialize(TypeEventOutput)
  @ApiResponse({ status: 201, type: TypeEventOutput })
  public async createCalendar(
    @Body() input: TypeEventInput,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<TypeEvent> {
    return this.typeEventService.create(input, admin);
  }

  @Delete(':id')
  @Serialize(VoidOutput)
  @ApiResponse({ status: 200, type: VoidOutput })
  public async deleteCalendar(
    @Param('id', UuidValidator) id: string,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<void> {
    return this.typeEventService.delete(id, admin);
  }

  @Get('')
  @Serialize(TypeEventsOutput)
  @ApiResponse({ status: 200, type: TypeEventsOutput })
  public async getCalendar(@Req() { admin }: DecodedTokenInterface): Promise<{
    records: TypeEvent[];
    totalRecords: number;
  }> {
    const [records, totalRecords] = await this.typeEventService.get(admin);
    return { records, totalRecords };
  }
  @Get(':id')
  @Serialize(TypeEventOutput)
  @ApiResponse({ status: 200, type: TypeEventOutput })
  public async getOneCalendar(
    @Param('id', UuidValidator) id: string,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<TypeEvent> {
    return this.typeEventService.getOne(id, admin);
  }
}
