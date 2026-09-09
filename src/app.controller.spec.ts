import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appController: AppController;

  const mockDataSource = {
    isInitialized: true,
    query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return welcome message', () => {
      expect(appController.getHello()).toEqual({
        message: 'Class Management API is online!',
        status: 'ok',
      });
    });

    it('should return health status', async () => {
      const result = await appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.database.status).toBe('connected');
    });
  });
});

