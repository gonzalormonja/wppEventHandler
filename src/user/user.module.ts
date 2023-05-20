import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([User]))],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
