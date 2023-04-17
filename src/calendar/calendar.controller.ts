import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendar } from './models/create-calendar.input';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { CalendarOutput } from './models/calendar.output';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { UuidValidator } from 'src/interceptors/uuid.validator';
import { VoidOutput } from 'src/models/void.output';
import { Calendar } from 'src/entities/calendar.entity';
import { CalendarsOutput } from './models/calendars.output';

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @Serialize(CalendarOutput)
  @ApiResponse({ status: 201, type: CalendarOutput })
  public async createCalendar(
    @Body() calendarInput: CreateCalendar,
  ): Promise<Calendar> {
    return this.calendarService.create(calendarInput);
  }

  @Patch(':id')
  @Serialize(CalendarOutput)
  @ApiResponse({ status: 200, type: CalendarOutput })
  public async updateCalendar(
    @Param('id', UuidValidator) id: string,
    @Body() calendarInput: CreateCalendar,
  ): Promise<Calendar> {
    return this.calendarService.update(id, calendarInput);
  }

  @Delete(':id')
  @Serialize(VoidOutput)
  @ApiResponse({ status: 200, type: VoidOutput })
  public async deleteCalendar(
    @Param('id', UuidValidator) id: string,
  ): Promise<void> {
    return this.calendarService.delete(id);
  }

  @Get('')
  @Serialize(CalendarsOutput)
  @ApiResponse({ status: 200, type: CalendarsOutput })
  public async getCalendar(): Promise<{
    records: Calendar[];
    totalRecords: number;
  }> {
    const [records, totalRecords] = await this.calendarService.get();
    return { records, totalRecords };
  }
  @Get(':id')
  @Serialize(CalendarOutput)
  @ApiResponse({ status: 200, type: CalendarOutput })
  public async getOneCalendar(
    @Param('id', UuidValidator) id: string,
  ): Promise<Calendar> {
    return this.calendarService.getOne(id);
  }
}
