import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { TypeEventInput } from './models/type-event.input';
import { TypeEvent } from 'src/entities/type-event.entity';
import { TypeEventService } from './type-event.service';
import { TypeEventOutput } from './models/type-event.output';
import { VoidOutput } from 'src/models/void.output';
import { UuidValidator } from 'src/interceptors/uuid.validator';
import { TypeEventsOutput } from './models/type-events.output';

@ApiTags('TypeEvent')
@Controller('type-event')
export class TypeEventController {
  constructor(private readonly typeEventService: TypeEventService) {}

  @Post()
  @Serialize(TypeEventOutput)
  @ApiResponse({ status: 201, type: TypeEventOutput })
  public async createCalendar(
    @Body() input: TypeEventInput,
  ): Promise<TypeEvent> {
    return this.typeEventService.create(input);
  }

  @Delete(':id')
  @Serialize(VoidOutput)
  @ApiResponse({ status: 200, type: VoidOutput })
  public async deleteCalendar(
    @Param('id', UuidValidator) id: string,
  ): Promise<void> {
    return this.typeEventService.delete(id);
  }

  @Get('')
  @Serialize(TypeEventsOutput)
  @ApiResponse({ status: 200, type: TypeEventsOutput })
  public async getCalendar(): Promise<{
    records: TypeEvent[];
    totalRecords: number;
  }> {
    const [records, totalRecords] = await this.typeEventService.get();
    return { records, totalRecords };
  }
  @Get(':id')
  @Serialize(TypeEventOutput)
  @ApiResponse({ status: 200, type: TypeEventOutput })
  public async getOneCalendar(
    @Param('id', UuidValidator) id: string,
  ): Promise<TypeEvent> {
    return this.typeEventService.getOne(id);
  }
}
