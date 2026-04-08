import { Module } from '@nestjs/common';
import { ContentModule } from './content/content.module';
import { DummyModule } from './dummy/dummy.module';

@Module({
  imports: [ContentModule, DummyModule],
})
export class AppModule {}
