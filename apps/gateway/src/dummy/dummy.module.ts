import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DummyProxyController } from './dummy-proxy.controller';
import { DummyProxyService } from './dummy-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [DummyProxyController],
  providers: [DummyProxyService],
})
export class DummyModule {}
