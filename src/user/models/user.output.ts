import { Expose } from 'class-transformer';

export class UserOutput {
  @Expose()
  wppId: string;
  @Expose()
  name: string;
}
