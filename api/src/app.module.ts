import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { StandardsModule } from './modules/standards/standards.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { MachinesModule } from './modules/machines/machines.module.js';
import { NewsEventsModule } from './modules/news-events/news-events.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'api/.env'],
    }),
    DatabaseModule,
    StandardsModule,
    MediaModule,
    MachinesModule,
    NewsEventsModule,
    ContactsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
