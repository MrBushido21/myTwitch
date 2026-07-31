import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MediaModule } from './media.module';

async function bootstrap() {
  const app = await NestFactory.create(MediaModule);
  const port = process.env.MEDIA_PORT || 3001
  app.useGlobalPipes(new ValidationPipe());
  app.enableShutdownHooks();
  await app.listen(Number(port));
  console.log(`server started on http://localhost:${port}/`);
}
bootstrap();
