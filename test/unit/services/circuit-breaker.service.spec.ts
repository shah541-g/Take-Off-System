import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from 'src/modules/hcm-integration/circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() }
        }
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start in CLOSED state', () => {
    expect(service.getState().state).toBe('CLOSED');
  });

  it('should record success and keep state CLOSED', async () => {
    await service.execute(async () => 'success');
    expect(service.getState().state).toBe('CLOSED');
  });

  it('should transition to OPEN after threshold failures', async () => {
    for (let i = 0; i < 5; i++) {
      try {
        await service.execute(async () => { throw new Error('fail'); });
      } catch (e) {}
    }
    expect(service.getState().state).toBe('OPEN');
  });
});
