import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Documentation')
    .setDescription('API description')
    .setVersion('1.0')
    .addTag('docs')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory)
  const port = process.env.PORT || 3000
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  await app.listen(Number(port));
  console.log(`server started on http://localhost:${port}/`);
}
bootstrap();
