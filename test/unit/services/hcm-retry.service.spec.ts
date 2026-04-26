import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HCMRetryService } from 'src/modules/hcm-integration/hcm-retry.service';
import { CircuitBreakerService } from 'src/modules/hcm-integration/circuit-breaker.service';

describe('HCMRetryService', () => {
  let service: HCMRetryService;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;

  beforeEach(async () => {
    circuitBreakerService = {
      execute: jest.fn((action) => action()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HCMRetryService,
        { provide: CircuitBreakerService, useValue: circuitBreakerService },
        { provide: ConfigService, useValue: { get: jest.fn() } }
      ],
    }).compile();

    service = module.get<HCMRetryService>(HCMRetryService);
  });

  it('should execute successfully without retries', async () => {
    const mockAction = jest.fn().mockResolvedValue('success');
    const result = await service.executeWithRetry(mockAction, 'test-action');
    expect(result).toBe('success');
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const mockAction = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValue('success');
      
    // Mock sleep to be instant
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => cb());

    const result = await service.executeWithRetry(mockAction, 'test-action');
    expect(result).toBe('success');
    expect(mockAction).toHaveBeenCalledTimes(2);
  });
});
