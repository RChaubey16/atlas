import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AuthModule, ContentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
