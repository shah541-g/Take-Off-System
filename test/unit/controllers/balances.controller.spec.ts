import { Test, TestingModule } from '@nestjs/testing';
import { BalancesController } from '../../../src/modules/balances/balances.controller';
import { BalancesService } from '../../../src/modules/balances/balances.service';

describe('BalancesController', () => {
  let controller: BalancesController;
  let balancesService: jest.Mocked<BalancesService>;

  beforeEach(async () => {
    balancesService = {
      getBalance: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalancesController],
      providers: [
        { provide: BalancesService, useValue: balancesService },
      ],
    }).compile();

    controller = module.get<BalancesController>(BalancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return balance', async () => {
      const mockBalance = { available_balance: '10' } as any;
      balancesService.getBalance.mockResolvedValue(mockBalance);

      const result = await controller.getBalance('emp1', 'loc1', 'VACATION', '2024');

      expect(result).toBe(mockBalance);
      expect(balancesService.getBalance).toHaveBeenCalledWith('emp1', 'loc1', 'VACATION', 2024);
    });
  });
});
