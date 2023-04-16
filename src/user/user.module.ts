import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([User]))],
  providers: [UserService],
})
export class UserModule {}
