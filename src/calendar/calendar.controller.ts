import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendar } from './models/create-calendar.input';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CalendarOutput } from './models/calendar.output';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UuidValidator } from '../interceptors/uuid.validator';
import { VoidOutput } from '../models/void.output';
import { Calendar } from '../entities/calendar.entity';
import { CalendarsOutput } from './models/calendars.output';
import { DecodedToken as DecodedTokenInterface } from 'src/models/decodedToken.interface';

@ApiBearerAuth()
@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @Serialize(CalendarOutput)
  @ApiResponse({ status: 201, type: CalendarOutput })
  public async createCalendar(
    @Body() calendarInput: CreateCalendar,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<Calendar> {
    return this.calendarService.create(calendarInput, admin);
  }

  @Patch(':id')
  @Serialize(CalendarOutput)
  @ApiResponse({ status: 200, type: CalendarOutput })
  public async updateCalendar(
    @Param('id', UuidValidator) id: string,
    @Body() calendarInput: CreateCalendar,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<Calendar> {
    return this.calendarService.update(id, calendarInput, admin);
  }

  @Delete(':id')
  @Serialize(VoidOutput)
  @ApiResponse({ status: 200, type: VoidOutput })
  public async deleteCalendar(
    @Param('id', UuidValidator) id: string,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<void> {
    return this.calendarService.delete(id, admin);
  }

  @Get('')
  @Serialize(CalendarsOutput)
  @ApiResponse({ status: 200, type: CalendarsOutput })
  public async getCalendar(@Req() { admin }: DecodedTokenInterface): Promise<{
    records: Calendar[];
    totalRecords: number;
  }> {
    const [records, totalRecords] = await this.calendarService.get(admin);
    return { records, totalRecords };
  }
  @Get(':id')
  @Serialize(CalendarOutput)
  @ApiResponse({ status: 200, type: CalendarOutput })
  public async getOneCalendar(
    @Param('id', UuidValidator) id: string,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<Calendar> {
    return this.calendarService.getOne(id, admin);
  }
}
