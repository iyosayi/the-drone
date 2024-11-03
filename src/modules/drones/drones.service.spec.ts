import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DronesService } from './drones.service';
import { DronesRepository } from '@modules/drones/repository/drone.repository';
import { HelperMethods } from '@common/helpers';
import { CreateDroneDto } from './dto/create-drone.dto';
import { DroneModelEnum, DroneStates } from '@common/enums';
import { MedicationRepository } from '@modules/medications/repository/medication.repository';
import { OrdersRepository } from './repository/orders.repository';
import { Drone } from './entities/drone.entity';
import { Medication } from '@modules/medications/entities/medication.entity';
import { Orders } from './entities/orders.entity';

describe('DronesService', () => {
  let service: DronesService;
  let helperMethods: HelperMethods;
  let droneRepository: DronesRepository;
  let ordersRepository: OrdersRepository;
  let medicationRepository: MedicationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DronesService,
        {
          provide: DronesRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            updateWithOperators: jest.fn(),
            byQuery: jest.fn(),
            byID: jest.fn(),
            all: jest.fn(),
          },
        },
        {
          provide: MedicationRepository,
          useValue: {
            create: jest.fn(),
            all: jest.fn(),
          },
        },
        {
          provide: OrdersRepository,
          useValue: {
            create: jest.fn(),
            createMany: jest.fn(),
            getOrders: jest.fn(),
          },
        },
        {
          provide: HelperMethods,
          useValue: {
            generateSerialNumber: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DronesService>(DronesService);
    service.MAX_WEIGHT_LIMIT = 500;
    service.MAX_MEDICATIONS_PER_DRONE = 5;
    service.MIN_BATTERY_THRESHOLD = 25;
    helperMethods = module.get<HelperMethods>(HelperMethods);
    droneRepository = module.get<DronesRepository>(DronesRepository);
    ordersRepository = module.get<OrdersRepository>(OrdersRepository);
    medicationRepository =
      module.get<MedicationRepository>(MedicationRepository);
  });
  describe('create', () => {
    it('should create a new drone and return it', async () => {
      const serialNumber = 'DRN24A1B2C3D4E5X';
      const createDroneDto: CreateDroneDto = {
        droneModel: DroneModelEnum.Heavyweight,
        weight: 500,
      };
      const savedDrone = { id: '1', serialNumber, ...createDroneDto };

      jest
        .spyOn(helperMethods, 'generateSerialNumber')
        .mockResolvedValue(serialNumber);
      // @ts-ignore
      jest.spyOn(droneRepository, 'create').mockResolvedValue(savedDrone);
      // @ts-ignore
      jest.spyOn(service, 'getDroneById').mockResolvedValue(savedDrone);

      const result = await service.create(createDroneDto);

      expect(helperMethods.generateSerialNumber).toHaveBeenCalledTimes(1);
      expect(droneRepository.create).toHaveBeenCalledWith({
        serialNumber,
        ...createDroneDto,
      });
      expect(service.getDroneById).toHaveBeenCalledWith(savedDrone.id);
      expect(result).toEqual(savedDrone);
    });

    it('should throw a BadRequestException if an error occurs', async () => {
      const error = new Error('Some error occurred');
      const createDroneDto: CreateDroneDto = {
        droneModel: DroneModelEnum.Heavyweight,
        weight: 500,
      };

      jest
        .spyOn(helperMethods, 'generateSerialNumber')
        .mockResolvedValue('DRN24A1B2C3D4E5X');
      jest.spyOn(droneRepository, 'create').mockRejectedValue(error);
      await expect(service.create(createDroneDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createDroneOrders', () => {
    it('should create orders for medications, update drone state, and return loaded medications', async () => {
      // @ts-ignore
      const drone: Drone = {
        id: '6724c651511b8dba22d88079',
        serialNumber: 'DRN240000000036',
        droneModel: DroneModelEnum.LightWeight,
      };
      const medications: Medication[] = [
        // @ts-ignore
        {
          id: 'med1',
          name: 'Urbaso-75',
          code: 'FC_828',
          weight: 20,
          image: 'medication_16.jpg',
        },
      ];
      const orders: Orders[] = [
        // @ts-ignore
        { drone: drone.id, medication: medications[0].id },
      ];
      const expectedResult = {
        serialNumber: drone.serialNumber,
        model: drone.model,
        medications: medications.map((med) => ({
          name: med.name,
          code: med.code,
          weight: med.weight,
          image: med.image,
        })),
        id: drone.id,
      };

      // @ts-ignore
      jest.spyOn(ordersRepository, 'createMany').mockResolvedValue(orders);
      jest.spyOn(droneRepository, 'update').mockResolvedValue({} as any);
      jest
        .spyOn(ordersRepository, 'getOrders')
        .mockResolvedValue(expectedResult);

      const result = await service.createDroneOrders(drone, medications);

      expect(ordersRepository.createMany).toHaveBeenCalledWith([
        { drone: drone.id, medication: medications[0].id },
      ]);
      expect(droneRepository.updateWithOperators).toHaveBeenCalledWith(
        { _id: drone.id },
        { $set: { state: DroneStates.Loaded }, $inc: { battery: -17 } },
      );
      expect(ordersRepository.getOrders).toHaveBeenCalledWith(drone.id);
      expect(result).toEqual(expectedResult);
    });

    it('should throw an error if createMany fails', async () => {
      // @ts-ignore
      const drone: Drone = {
        id: '6724c651511b8dba22d88079',
        serialNumber: 'DRN240000000036',
        droneModel: DroneModelEnum.LightWeight,
      };
      const medications: Medication[] = [
        // @ts-ignore
        {
          id: 'med1',
          name: 'Urbaso-75',
          code: 'FC_828',
          weight: 20,
          image: 'medication_16.jpg',
        },
      ];
      const error = new Error('Failed to create orders');

      jest.spyOn(ordersRepository, 'createMany').mockRejectedValue(error);

      await expect(
        service.createDroneOrders(drone, medications),
      ).rejects.toThrow('Failed to create orders');
    });
  });

  // describe.only('performLoadChecks', () => {
  //   // it('should throw an error if total weight exceeds maximum limit', () => {
  //   //   const drone: Drone = { droneModel: DroneModelEnum.Heavyweight } as Drone;
  //   //   const medications: Medication[] = [
  //   //     { weight: 300 },
  //   //     { weight: 250 },
  //   //   ] as Medication[];

  //   //   expect(() => service.performLoadChecks(drone, medications)).toThrow(
  //   //     new BadRequestException(
  //   //       'Total medication weight (550g) exceeds drone limit (500g)',
  //   //     ),
  //   //   );
  //   // });

  //   // it.only('should throw an error if weight exceeds Lightweight drone capacity', () => {
  //   //   const drone: Drone = { droneModel: DroneModelEnum.LightWeight } as Drone;
  //   //   const medications: Medication[] = [
  //   //     { weight: 100 },
  //   //     { weight: 60 },
  //   //   ] as Medication[];
  //   //   jest.spyOn(service, 'performLoadChecks')
  //   //   expect(() => service.performLoadChecks(drone, medications)).toThrow(
  //   //     new BadRequestException('Weight exceeds remaining capacity for Lightweight drone. Can only add 150g capacity'),
  //   //   );
  //   // });

  //   // it('should throw an error if weight exceeds Middleweight drone capacity', () => {
  //   //   const drone: Drone = { droneModel: DroneModelEnum.Middleweight } as Drone;
  //   //   const medications: Medication[] = [
  //   //     { weight: 150 },
  //   //     { weight: 160 },
  //   //   ] as Medication[];

  //   //   expect(() => service.performLoadChecks(drone, medications)).toThrow(
  //   //     new BadRequestException('Weight exceeds Middleweight drone capacity'),
  //   //   );
  //   // });

  //   // it('should throw an error if weight exceeds Cruiserweight drone capacity', () => {
  //   //   const drone: Drone = {
  //   //     droneModel: DroneModelEnum.Cruiserweight,
  //   //   } as Drone;
  //   //   const medications: Medication[] = [
  //   //     { weight: 200 },
  //   //     { weight: 250 },
  //   //   ] as Medication[];

  //   //   expect(() => service.performLoadChecks(drone, medications)).toThrow(
  //   //     new BadRequestException('Weight exceeds Cruiserweight drone capacity'),
  //   //   );
  //   // });

  //   // it('should not throw an error if weight is within Heavyweight drone capacity', () => {
  //   //   const drone: Drone = { droneModel: DroneModelEnum.Heavyweight } as Drone;
  //   //   const medications: Medication[] = [
  //   //     { weight: 200 },
  //   //     { weight: 250 },
  //   //   ] as Medication[];

  //   //   expect(() =>
  //   //     service.performLoadChecks(drone, medications),
  //   //   ).not.toThrow();
  //   // });

  //   // it('should not throw an error if weight is within maximum limit and specific drone model limits', () => {
  //   //   const drone: Drone = { droneModel: DroneModelEnum.Middleweight } as Drone;
  //   //   const medications: Medication[] = [
  //   //     { weight: 100 },
  //   //     { weight: 150 },
  //   //   ] as Medication[];

  //   //   expect(() =>
  //   //     service.performLoadChecks(drone, medications),
  //   //   ).not.toThrow();
  //   // });

  //   it('should pass load check for a lightweight drone within capacity', async () => {
  //     const drone: Drone = { id: '1', droneModel: DroneModelEnum.LightWeight, state: 'IDLE' } as Drone;
  //     const medications: Medication[] = [{ weight: 30 }, { weight: 50 }] as Medication[];

  //     jest.spyOn(ordersRepository, 'getOrders').mockResolvedValue({ totalMedicationWeight: 50 });
  //     // ordersRepository.getOrders.mockResolvedValue({ totalMedicationWeight: 50 });

  //     await expect(service.performLoadChecks(drone, medications)).resolves.not.toThrow();
  //   });

  //   it('should throw error if total weight exceeds drone max weight limit', async () => {
  //     const drone: Drone = { id: '2', droneModel: DroneModelEnum.Heavyweight, state: 'IDLE' } as Drone;
  //     const medications: Medication[] = [{ weight: 400 }, { weight: 150 }] as Medication[];

  //     jest.spyOn(ordersRepository, 'getOrders').mockResolvedValue({totalMedicationWeight: 0})
  //     // ordersRepository.getOrders.mockResolvedValue({ totalMedicationWeight: 0 });

  //     await expect(service.performLoadChecks(drone, medications)).rejects.toThrow(
  //       new BadRequestException('Total medication weight (550g) exceeds drone limit (500g)')
  //     );
  //   });

  //   it('should throw error if loading weight exceeds remaining capacity for lightweight drone', async () => {
  //     const drone: Drone = { id: '3', droneModel: DroneModelEnum.LightWeight, state: 'IDLE' } as Drone;
  //     const medications: Medication[] = [{ weight: 50 }] as Medication[];

  //     jest.spyOn(ordersRepository, 'getOrders').mockResolvedValue({ totalMedicationWeight: 120 });
  //     // ordersRepository.getOrders.mockResolvedValue({ totalMedicationWeight: 120 });

  //     await expect(service.performLoadChecks(drone, medications)).rejects.toThrow(
  //       new BadRequestException('Weight exceeds remaining capacity for LightWeight drone. Can only add 30g more.')
  //     );
  //   });

  //   it('should throw error if total weight exceeds Cruiserweight drone capacity', async () => {
  //     const drone: Drone = { id: '4', droneModel: DroneModelEnum.Cruiserweight, state: 'IDLE' } as Drone;
  //     const medications: Medication[] = [{ weight: 250 }, { weight: 200 }] as Medication[];

  //     jest.spyOn(ordersRepository, 'getOrders').mockResolvedValue({totalMedicationWeight: 0})

  //     await expect(service.performLoadChecks(drone, medications)).rejects.toThrow(
  //       new BadRequestException('Total weight exceeds Cruiserweight drone capacity')
  //     );
  //   });

  //   it('should pass load check for a Cruiserweight drone within capacity', async () => {
  //     const drone: Drone = { id: '5', droneModel: DroneModelEnum.Cruiserweight, state: 'IDLE' } as Drone;
  //     const medications: Medication[] = [{ weight: 200 }, { weight: 150 }] as Medication[];

  //     jest.spyOn(ordersRepository, 'getOrders').mockResolvedValue({totalMedicationWeight: 50})

  //     await expect(service.performLoadChecks(drone, medications)).resolves.not.toThrow();
  //   });

  //   it.skip('should throw error if total weight exceeds Heavyweight drone capacity', async () => {
  //     const drone: Drone = { id: '6', droneModel: DroneModelEnum.Heavyweight, state: 'IDLE' } as Drone;
  //     const medications: Medication[] = [{ weight: 300 }, { weight: 250 }] as Medication[];

  //     jest.spyOn(ordersRepository, 'getOrders').mockResolvedValue({totalMedicationWeight: 0})

  //     await expect(service.performLoadChecks(drone, medications)).rejects.toThrow(
  //       new BadRequestException('Total weight exceeds Heavyweight drone capacity')
  //     );
  //   });

  // });

  describe('validateMedications', () => {
    it('should throw an error if the number of unique medications exceeds the maximum limit', async () => {
      const medicationIds = ['id1', 'id2', 'id3', 'id4', 'id5', 'id6']; // 6 unique IDs, exceeding the limit

      await expect(service.validateMedications(medicationIds)).rejects.toThrow(
        new BadRequestException(
          'Exceeded maximum medications per drone. Limit: 5',
        ),
      );
    });

    it('should throw an error if one or more medications are not found', async () => {
      const medicationIds = ['id1', 'id2', 'id3'];
      jest
        .spyOn(medicationRepository, 'all')
        // @ts-ignore
        .mockResolvedValue([{ id: 'id1' }, { id: 'id2' }] as Medication[]);

      await expect(service.validateMedications(medicationIds)).rejects.toThrow(
        new BadRequestException('One or more medications not found'),
      );
    });

    it('should return the medications if they are valid and within the limit', async () => {
      const medicationIds = ['id1', 'id2', 'id3'];
      const medications = [
        { id: 'id1', name: 'Med1', weight: 50 },
        { id: 'id2', name: 'Med2', weight: 30 },
        { id: 'id3', name: 'Med3', weight: 20 },
      ] as Medication[];

      // @ts-ignore
      jest.spyOn(medicationRepository, 'all').mockResolvedValue(medications);

      const result = await service.validateMedications(medicationIds);

      expect(result).toEqual(medications);
      expect(medicationRepository.all).toHaveBeenCalledWith({
        conditions: {
          _id: { $in: [...new Set(medicationIds)] },
        },
      });
    });
  });
  describe('loadDroneWithMedications', () => {
    it('should successfully load medications onto a drone', async () => {
      const serialNumber = 'DRN240000000036';
      const medicationIds = ['med1', 'med2'];
      const drone = {
        id: 'drone1',
        state: DroneStates.Idle,
        battery: 100,
      } as Drone;
      const medications = [{ id: 'med1' }, { id: 'med2' }] as Medication[];
      const orders = [{ id: 'order1' }, { id: 'order2' }] as Orders[];

      jest.spyOn(service, 'validateDroneForLoading').mockResolvedValue(drone);
      jest.spyOn(service, 'validateMedications').mockResolvedValue(medications);
      jest.spyOn(service, 'performLoadChecks').mockImplementation();
      jest.spyOn(service, 'createDroneOrders').mockResolvedValue(orders);

      const result = await service.loadDroneMedications(
        serialNumber,
        medicationIds,
      );

      expect(result).toEqual(orders);
      expect(service.validateDroneForLoading).toHaveBeenCalledWith(
        serialNumber,
      );
      expect(service.validateMedications).toHaveBeenCalledWith(medicationIds);
      expect(service.performLoadChecks).toHaveBeenCalledWith(
        drone,
        medications,
      );
      expect(service.createDroneOrders).toHaveBeenCalledWith(
        drone,
        medications,
      );
    });

    it('should throw an error if the drone does not exist', async () => {
      const serialNumber = 'DRN240000000036';
      const medicationIds = ['med1', 'med2'];

      jest
        .spyOn(service, 'validateDroneForLoading')
        .mockRejectedValue(new BadRequestException('Drone not found'));

      await expect(
        service.loadDroneMedications(serialNumber, medicationIds),
      ).rejects.toThrow(new BadRequestException('Drone not found'));
    });

    it('should throw an error if the drone is not in the Idle state', async () => {
      const serialNumber = 'DRN240000000036';
      const medications = [{ id: 'med1' }, { id: 'med2' }] as Medication[];
      const drone = {
        id: 'drone1',
        state: DroneStates.Loaded,
        battery: 100,
      } as Drone;
      // @ts-ignore
      jest.spyOn(droneRepository, 'byQuery').mockResolvedValue(drone);

      await expect(
        service.loadDroneMedications(
          serialNumber,
          medications.map((med) => med.id),
        ),
      ).rejects.toThrow(
        new BadRequestException(
          `Cannot load drone. Current state: ${drone.state}`,
        ),
      );
    });

    it('should throw an error if the drone battery is below minimum threshold', async () => {
      const serialNumber = 'DRN240000000036';
      const medicationIds = ['med1', 'med2'];
      const drone = {
        id: 'drone1',
        state: DroneStates.Idle,
        battery: 20,
      } as Drone;

      jest
        .spyOn(service, 'validateDroneForLoading')
        .mockRejectedValue(
          new BadRequestException(
            `Drone battery too low. Current: 20%. Minimum: ${service.MIN_BATTERY_THRESHOLD}%`,
          ),
        );

      await expect(
        service.loadDroneMedications(serialNumber, medicationIds),
      ).rejects.toThrow(
        new BadRequestException(
          `Drone battery too low. Current: 20%. Minimum: ${service.MIN_BATTERY_THRESHOLD}%`,
        ),
      );
    });

    it('should throw an error if one or more medications are not found', async () => {
      const serialNumber = 'DRN240000000036';
      const medicationIds = ['med1', 'med2'];

      jest.spyOn(service, 'validateDroneForLoading').mockResolvedValue({
        id: 'drone1',
        state: DroneStates.Idle,
        battery: 100,
      } as Drone);
      jest
        .spyOn(service, 'validateMedications')
        .mockRejectedValue(
          new BadRequestException('One or more medications not found'),
        );

      await expect(
        service.loadDroneMedications(serialNumber, medicationIds),
      ).rejects.toThrow(
        new BadRequestException('One or more medications not found'),
      );
    });

    it('should throw an error if medications exceed weight limit during load checks', async () => {
      const serialNumber = 'DRN240000000036';
      const medicationIds = ['med1', 'med2'];
      const drone = {
        id: 'drone1',
        state: DroneStates.Idle,
        battery: 100,
      } as Drone;
      const medications = [{ id: 'med1' }, { id: 'med2' }] as Medication[];

      jest.spyOn(service, 'validateDroneForLoading').mockResolvedValue(drone);
      jest.spyOn(service, 'validateMedications').mockResolvedValue(medications);
      jest.spyOn(service, 'performLoadChecks').mockImplementation(() => {
        throw new BadRequestException(
          'Total medication weight exceeds drone limit',
        );
      });

      await expect(
        service.loadDroneMedications(serialNumber, medicationIds),
      ).rejects.toThrow(
        new BadRequestException('Total medication weight exceeds drone limit'),
      );
    });
  });
  describe('getDroneById', () => {
    it('should successfully retrieve a drone by ID', async () => {
      const id = 'drone1';
      // @ts-ignore
      const mockDrone = {
        id,
        serialNumber: 'DRN240000000036',
        droneModel: 'Model X',
        state: DroneStates.Idle,
        weight: 500,
        battery: 85,
      } as Drone;

      // @ts-ignore
      jest.spyOn(droneRepository, 'byID').mockResolvedValue(mockDrone);

      const result = await service.getDroneById(id);

      expect(result).toEqual({
        id: mockDrone.id,
        serialNumber: mockDrone.serialNumber,
        model: mockDrone.droneModel,
        state: mockDrone.state,
        weight: mockDrone.weight,
        battery: mockDrone.battery,
      });
      expect(droneRepository.byID).toHaveBeenCalledWith(id);
    });

    it('should throw an error if the drone is not found', async () => {
      const id = 'nonexistent-drone';

      jest.spyOn(droneRepository, 'byID').mockResolvedValue(null);

      await expect(service.getDroneById(id)).rejects.toThrow(
        new NotFoundException(`Drone with ID ${id} not found`),
      );
      expect(droneRepository.byID).toHaveBeenCalledWith(id);
    });
  });
  describe('getAvailableDrones', () => {
    it('should return a list of available drones', async () => {
      const mockDrones = [
        {
          id: 'drone1',
          serialNumber: 'DRN240000000001',
          state: DroneStates.Loading,
        },
        {
          id: 'drone2',
          serialNumber: 'DRN240000000002',
          state: DroneStates.Loaded,
        },
      ];

      // @ts-ignore
      jest.spyOn(droneRepository, 'all').mockResolvedValue(mockDrones);

      const result = await service.getAvailableDrones();

      expect(result).toEqual(mockDrones);
      expect(droneRepository.all).toHaveBeenCalledWith({
        conditions: { state: { $ne: DroneStates.Idle } },
      });
    });

    it('should return an empty array if no drones are available', async () => {
      jest.spyOn(droneRepository, 'all').mockResolvedValue([]);

      const result = await service.getAvailableDrones();

      expect(result).toEqual([]);
      expect(droneRepository.all).toHaveBeenCalledWith({
        conditions: { state: { $ne: DroneStates.Idle } },
      });
    });
  });
  describe('getDroneBatteryHealth', () => {
    it('should return the battery health of a drone', async () => {
      const mockDrone = { id: 'drone1', battery: 75 };

      // @ts-ignore
      jest.spyOn(droneRepository, 'byID').mockResolvedValue(mockDrone);

      const result = await service.getDroneBatteryHealth('drone1');

      expect(result).toEqual({ battery: 75 });
      expect(droneRepository.byID).toHaveBeenCalledWith('drone1');
    });

    it('should return 0 battery health if battery is null', async () => {
      const mockDrone = { id: 'drone1', battery: null };
      // @ts-ignore
      jest.spyOn(droneRepository, 'byID').mockResolvedValue(mockDrone);

      const result = await service.getDroneBatteryHealth('drone1');

      expect(result).toEqual({ battery: 0 });
      expect(droneRepository.byID).toHaveBeenCalledWith('drone1');
    });

    it('should return 0 as battery health if battery is 0', async () => {
      const mockDrone = { id: 'drone1', battery: 0 };
      // @ts-ignore
      jest.spyOn(droneRepository, 'byID').mockResolvedValue(mockDrone);

      const result = await service.getDroneBatteryHealth('drone1');

      expect(result).toEqual({ battery: 0 });
      expect(droneRepository.byID).toHaveBeenCalledWith('drone1');
    });

    it('should throw NotFoundException if drone does not exist', async () => {
      jest.spyOn(droneRepository, 'byID').mockResolvedValue(null);

      await expect(
        service.getDroneBatteryHealth('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(droneRepository.byID).toHaveBeenCalledWith('nonexistent-id');
    });
  });
});
