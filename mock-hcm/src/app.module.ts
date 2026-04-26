import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { BalanceController } from './controllers/balance.controller';
import { RequestController } from './controllers/request.controller';
import { AdminController } from './controllers/admin.controller';

// Services
import { BalanceService } from './services/balance.service';
import { RequestService } from './services/request.service';
import { BehaviorEngine } from './services/behavior-engine.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [BalanceController, RequestController, AdminController],
  providers: [BehaviorEngine, BalanceService, RequestService],
})
export class AppModule {}
