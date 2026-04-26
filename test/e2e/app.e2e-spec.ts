import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
  });

  it('/api/v1/admin/sync/balances (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/admin/sync/balances')
      .send({
        employees: [
          { employeeId: 'emp1', locationId: 'loc1', leaveType: 'VACATION' }
        ]
      })
      .expect(201);
  });

  it('/api/v1/admin/detect-drift (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/admin/detect-drift')
      .send({
        employeeId: 'emp1', locationId: 'loc1', leaveType: 'VACATION', year: 2024
      })
      .expect(201);
  });
});
