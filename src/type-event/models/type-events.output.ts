import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TypeEventOutput } from './type-event.output';

export class TypeEventsOutput {
  @Expose()
  @ApiProperty({ type: [TypeEventOutput] })
  @Type(() => TypeEventOutput)
  records: TypeEventOutput;
  @ApiProperty()
  @Expose()
  totalRecords: number;
}
