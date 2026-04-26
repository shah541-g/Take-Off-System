import { Test, TestingModule } from '@nestjs/testing';
import { RequestsController } from '../../../src/modules/requests/requests.controller';
import { TimeOffRequestService } from '../../../src/modules/requests/requests.service';

describe('RequestsController', () => {
  let controller: RequestsController;
  let requestsService: jest.Mocked<TimeOffRequestService>;

  beforeEach(async () => {
    requestsService = {
      createRequest: jest.fn(),
      getRequest: jest.fn(),
      approveRequest: jest.fn(),
      rejectRequest: jest.fn(),
      cancelRequest: jest.fn(),
      getRequestsByEmployee: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        { provide: TimeOffRequestService, useValue: requestsService },
      ],
    }).compile();

    controller = module.get<RequestsController>(RequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRequest', () => {
    it('should create a request', async () => {
      const mockRequest = { id: 'req1', status: 'PENDING' } as any;
      requestsService.createRequest.mockResolvedValue(mockRequest);

      const result = await controller.createRequest({ employeeId: 'emp1', leaveType: 'VACATION' } as any);

      expect(result).toBe(mockRequest);
      expect(requestsService.createRequest).toHaveBeenCalled();
    });
  });

  describe('getRequest', () => {
    it('should return a request', async () => {
      const mockRequest = { id: 'req1', status: 'PENDING' } as any;
      requestsService.getRequest.mockResolvedValue(mockRequest);

      const result = await controller.getRequest('req1');

      expect(result).toBe(mockRequest);
      expect(requestsService.getRequest).toHaveBeenCalledWith('req1');
    });
  });
});
