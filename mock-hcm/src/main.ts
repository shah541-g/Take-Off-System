import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('hcm');

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Mock HCM API')
    .setDescription(
      'Mock HCM server for testing time-off microservice with 7 configurable failure behaviors',
    )
    .setVersion('1.0')
    .addTag('balances', 'Balance management endpoints')
    .addTag('time-off-requests', 'Time-off request endpoints')
    .addTag('admin', 'Administrative endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.MOCK_HCM_PORT) || 3001;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Mock HCM Server Started Successfully               ║
╠════════════════════════════════════════════════════════════╣
║  🚀 API Base URL:  http://localhost:${port}/hcm             ║
║  📚 Swagger Docs:  http://localhost:${port}/docs            ║
║                                                            ║
║  Available Behaviors:                                      ║
║  • NORMAL              - Normal operation                 ║
║  • TIMEOUT             - Delay >6 seconds                 ║
║  • PARTIAL_FAILURE     - Fail first 3 calls, then ok     ║
║  • DRIFT               - Return different balance each    ║
║  • CIRCUIT_BREAKER     - Fail first 5 calls consistently ║
║  • INVALID_DIMENSION   - Return 404 for bad combos      ║
║  • INSUFFICIENT_BALANCE- Return 403 if insufficient      ║
║                                                            ║
║  Admin Endpoints:                                          ║
║  POST   /hcm/admin/set-behavior                            ║
║  POST   /hcm/admin/reset-behavior                          ║
║  GET    /hcm/admin/state                                   ║
║  POST   /hcm/admin/reset-all                               ║
╚════════════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start Mock HCM server:', error);
  process.exit(1);
});
