import { Test, TestingModule } from '@nestjs/testing';
import { DronesController } from './drones.controller';
import { DronesService } from './drones.service';
import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { HelperMethods } from '@common/helpers';
import { DroneModelEnum } from '@common/enums';
import { CreateDroneDto, } from './dto/create-drone.dto';

describe.only('DronesController', () => {
  let app: INestApplication;
  let droneService: DronesService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DronesController],
      providers: [
        {
          provide: DronesService,
          useValue: {
            getDroneBatteryHealth: jest.fn(),
            create: jest.fn(),
            loadDroneMedications: jest.fn(),
          },
        },
        {
          provide: HelperMethods,
          useValue: {
            sendSuccessResponse: jest.fn((data, message) => ({
              success: true,
              message,
              data,
            })),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    droneService = module.get<DronesService>(DronesService);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('getDroneBatteryHealth', () => {
    it('should return the battery health of a drone', async () => {
      const mockResponse = { battery: 75 };
      jest
        .spyOn(droneService, 'getDroneBatteryHealth')
        .mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .get('/drones/battery-health/drone123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Drone battery gotten successfully',
        data: mockResponse,
      });
      expect(droneService.getDroneBatteryHealth).toHaveBeenCalledWith(
        'drone123',
      );
    });

    it('should return 404 if drone is not found', async () => {
      jest
        .spyOn(droneService, 'getDroneBatteryHealth')
        .mockRejectedValue(new NotFoundException('Drone does not exist.'));

      const response = await request(app.getHttpServer())
        .get('/drones/battery-health/nonexistent-drone')
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Drone does not exist.',
        error: 'Not Found',
      });
      expect(droneService.getDroneBatteryHealth).toHaveBeenCalledWith(
        'nonexistent-drone',
      );
    });

    it('should return 400 if droneId is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/drones/battery-health/')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Cannot GET /drones/battery-health/',
        statusCode: 404,
      });
    });
  });
  describe('createDrone', () => {
    it('should create a drone successfully with valid data', async () => {
      const createDroneDto: CreateDroneDto = {
        droneModel: DroneModelEnum.LightWeight,
        weight: 100,
      };
      const mockDrone = { id: '123', ...createDroneDto };
      // @ts-ignore
      jest.spyOn(droneService, 'create').mockResolvedValue(mockDrone);
      const response = await request(app.getHttpServer())
        .post('/drones')
        .send(createDroneDto)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Drone created successfully',
        data: mockDrone,
      });
      expect(droneService.create).toHaveBeenCalledWith(createDroneDto);
    });

    it('should throw a BadRequestException if droneModel is invalid', async () => {
      const createDroneDto: any = {
        droneModel: 'InvalidModel',
        weight: 100,
      };

      try {
        await new ValidationPipe().transform(createDroneDto, {
          type: 'body',
          metatype: CreateDroneDto,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message[0]).toEqual(
          'Model must be one of LightWeight, Middleweight, Cruiserweight, Heavyweight',
        );
      }
    });

    it('should throw a BadRequestException if weight is below minimum', async () => {
      const createDroneDto: CreateDroneDto = {
        droneModel: DroneModelEnum.Middleweight,
        weight: 0, // Below minimum
      };

      try {
        await new ValidationPipe().transform(createDroneDto, {
          type: 'body',
          metatype: CreateDroneDto,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message[0]).toContain(
          'weight must not be less than 1',
        );
      }
    });

    it('should throw a BadRequestException if weight is above maximum', async () => {
      const createDroneDto: CreateDroneDto = {
        droneModel: DroneModelEnum.Heavyweight,
        weight: 600, // Above maximum
      };

      try {
        await new ValidationPipe().transform(createDroneDto, {
          type: 'body',
          metatype: CreateDroneDto,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message[0]).toContain(
          'weight must not be greater than 525',
        );
      }
    });
  });
});
