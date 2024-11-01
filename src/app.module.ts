import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DronesModule } from '@modules/drones/drones.module';
import { databaseConnectionOpts } from './common/database';
import { MedicationsModule } from './modules/medications/medications.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
    MongooseModule.forRootAsync(databaseConnectionOpts),
    DronesModule,
    MedicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
