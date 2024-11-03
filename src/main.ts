import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MedicationSeeder } from '@modules/medications/medication.seeder';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  const seeder = app.get(MedicationSeeder);
  await seeder.seed();
  await app.listen(3000);
}
bootstrap();
