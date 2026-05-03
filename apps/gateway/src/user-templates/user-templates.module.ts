import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserTemplatesProxyController } from './user-templates-proxy.controller';
import { UserTemplatesProxyService } from './user-templates-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [UserTemplatesProxyController],
  providers: [UserTemplatesProxyService],
})
export class UserTemplatesModule {}
