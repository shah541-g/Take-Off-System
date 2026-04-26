import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsModule } from 'src/modules/requests/requests.module';
import { BalancesModule } from 'src/modules/balances/balances.module';
import { AuditModule } from 'src/modules/audit/audit.module';
import { HCMModule } from 'src/modules/hcm-integration/hcm.module';
import { SyncModule } from 'src/modules/sync/sync.module';
import { HealthModule } from 'src/modules/health/health.module';
import { TimeOffRequestService } from 'src/modules/requests/requests.service';
import { BalancesService } from 'src/modules/balances/balances.service';
import { HCMClient } from 'src/modules/hcm-integration/hcm-client';
import { Request } from 'src/entities/request.entity';
import { Balance } from 'src/entities/balance.entity';
import { AuditLog } from 'src/entities/audit-log.entity';
import { BalanceHistory } from 'src/entities/balance-history.entity';

describe('Requests Integration', () => {
  let moduleRef: TestingModule;
  let requestsService: TimeOffRequestService;
  let balancesService: BalancesService;
  let hcmClient: HCMClient;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Request, Balance, AuditLog, BalanceHistory],
          synchronize: true,
        }),
        RequestsModule,
        BalancesModule,
        AuditModule,
        HCMModule,
        SyncModule,
        HealthModule,
      ],
    })
    .overrideProvider(HCMClient)
    .useValue({
      getBalance: jest.fn().mockResolvedValue({ available: 20, used: 0 }),
    })
    .compile();

    requestsService = moduleRef.get(TimeOffRequestService);
    balancesService = moduleRef.get(BalancesService);
    hcmClient = moduleRef.get(HCMClient);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should successfully complete a request lifecycle', async () => {
    // We mock the DB state by directly using BalancesService to first cache/load a balance
    // Wait, the DB is empty. A balance check will trigger hydration from HCM.
    // HCMClient is mocked to return { available: 20, used: 0 }.
    
    // 1. Create a request (this will trigger hydration)
    const request = await requestsService.createRequest({
      employeeId: 'INT001',
      locationId: 'LOC1',
      leaveType: 'VACATION',
      startDate: '2024-12-01',
      endDate: '2024-12-05',
      daysRequested: 5,
    });

    expect(request.id).toBeDefined();
    expect(request.status).toBe('PENDING');

    // 2. Approve the request
    const approved = await requestsService.approveRequest(request.id, { approverId: 'MGR1' });
    expect(approved.status).toBe('APPROVED');

    // 3. Verify balance deduction
    const balance = await balancesService.getBalance('INT001', 'LOC1', 'VACATION', new Date().getFullYear());
    expect(parseFloat(balance.available_balance)).toBe(15);
    expect(parseFloat(balance.used_balance)).toBe(5);
  });
});
