import { Module, forwardRef } from '@nestjs/common';
import { AdminService } from './admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../entities/admin.entity';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([Admin]))],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
