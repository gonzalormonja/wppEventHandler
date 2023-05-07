import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Status } from '../../models/status.enum';

export class UpdateEvent {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;
  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? new Date(value) : null))
  @IsDate()
  @IsOptional()
  dateTime: Date;
  @ApiPropertyOptional()
  @IsEnum(Status)
  @IsOptional()
  status: Status;
}
