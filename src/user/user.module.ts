import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserController } from './user.controller';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([User]))],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
