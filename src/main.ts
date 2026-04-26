import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Time-Off Microservice API')
    .setDescription('Time-Off Balance Management Microservice for ReadyOn')
    .setVersion('1.0')
    .addTag('Health')
    .addTag('Time-Off Requests')
    .addTag('Sync & Admin')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port =
    Number(process.env.TAKE_OFF_PORT) ||
    Number(process.env.APP_PORT) ||
    3000;
  await app.listen(port);

  console.log(`Time-Off service is running on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Time-Off service:', error);
  process.exit(1);
});
