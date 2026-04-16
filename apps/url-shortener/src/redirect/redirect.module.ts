import { Module } from '@nestjs/common';
import { RedirectController } from './redirect.controller';
import { LinksModule } from '../links/links.module';

@Module({
  imports: [LinksModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
