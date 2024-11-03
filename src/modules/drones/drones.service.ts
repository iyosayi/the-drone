import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDroneDto } from './dto/create-drone.dto';
import { DronesRepository } from './repository/drone.repository';
import { HelperMethods } from '@common/helpers';
import { DroneModelEnum, DroneStates } from '@common/enums';
import { MedicationRepository } from '@modules/medications/repository/medication.repository';
import { OrdersRepository } from './repository/orders.repository';
import { Drone } from './entities/drone.entity';
import { Medication } from '@modules/medications/entities/medication.entity';
import { Orders } from './entities/orders.entity';

@Injectable()
export class DronesService {
  public MAX_WEIGHT_LIMIT = 500;
  public MIN_BATTERY_THRESHOLD = 25;
  public MAX_MEDICATIONS_PER_DRONE = 5;

  constructor(
    private readonly droneRepository: DronesRepository,
    private readonly medicationRepository: MedicationRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly helperMethods: HelperMethods,
  ) {}
  async create(createDroneDto: CreateDroneDto) {
    try {
      const serial = await this.helperMethods.generateSerialNumber();
      const drone = await this.droneRepository.create({
        serialNumber: serial,
        ...createDroneDto,
      });
      return this.getDroneById(drone.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async unloadDrone(serialNumber: string): Promise<Drone> {
    const drone = await this.droneRepository.updateWithOperators(
      { serialNumber, state: DroneStates.Loading },
      {
        $set: {
          state: DroneStates.Idle,
          loadedMedications: [],
          lastUnloadedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!drone) {
      throw new BadRequestException(
        'Cannot unload drone. Invalid state or not found.',
      );
    }

    return drone;
  }
  async createDroneOrders(
    drone: Drone,
    medications: Medication[],
  ): Promise<Orders[]> {
    const bulkInsertOpts = medications.map((med) => ({
      drone: drone.id,
      medication: med.id,
    }));
    // @ts-ignore
    await this.ordersRepository.createMany(bulkInsertOpts);
    this.updateDroneState(drone.id, DroneStates.Loaded);
    return this.ordersRepository.getOrders(drone.id);
  }

  async calculateRemainingWeight(drone: Drone) {
    const weightMap = {
      [DroneModelEnum.LightWeight]: 150,
      [DroneModelEnum.Middleweight]: 300,
      [DroneModelEnum.Cruiserweight]: 400,
      [DroneModelEnum.Heavyweight]: 500,
    };

    const orders = await this.ordersRepository.getOrders(drone.id);
    const totalMedicationWeight = orders?.totalMedicationWeight ?? 0;
    const maxCapacity = weightMap[drone.droneModel];
    const remainingCapacity = maxCapacity - totalMedicationWeight;
    return { remainingCapacity, maxCapacity, totalMedicationWeight };
  }

  async performLoadChecks(
    drone: Drone,
    medications: Medication[],
  ): Promise<void> {
    const totalWeight = medications.reduce(
      (sum, medication) => sum + medication.weight,
      0,
    );
    const { remainingCapacity, totalMedicationWeight, maxCapacity } =
      await this.calculateRemainingWeight(drone);
    if (totalWeight > this.MAX_WEIGHT_LIMIT) {
      throw new BadRequestException(
        `Total medication weight (${totalWeight}g) exceeds drone limit (${this.MAX_WEIGHT_LIMIT}g)`,
      );
    }

    if (totalWeight > remainingCapacity) {
      throw new BadRequestException(
        `Weight exceeds remaining capacity for ${drone.droneModel} drone. Can only add ${remainingCapacity}g more.`,
      );
    }

    switch (drone.droneModel) {
      case DroneModelEnum.LightWeight:
        if (totalWeight + totalMedicationWeight > 150) {
          throw new BadRequestException(
            'Total weight exceeds Lightweight drone capacity',
          );
        }
        break;
      case DroneModelEnum.Middleweight:
        if (totalWeight + totalMedicationWeight > 300) {
          throw new BadRequestException(
            'Total weight exceeds Middleweight drone capacity',
          );
        }
        break;
      case DroneModelEnum.Cruiserweight:
        if (totalWeight + totalMedicationWeight > 400) {
          throw new BadRequestException(
            'Total weight exceeds Cruiserweight drone capacity',
          );
        }
        break;
      case DroneModelEnum.Heavyweight:
        if (totalWeight + totalMedicationWeight > 500) {
          throw new BadRequestException(
            'Total weight exceeds Heavyweight drone capacity',
          );
        }
        break;
    }
  }

  async validateMedications(medicationIds: string[]): Promise<Medication[]> {
    const uniqueMedicationIds = [...new Set(medicationIds)];
    if (uniqueMedicationIds.length > this.MAX_MEDICATIONS_PER_DRONE) {
      throw new BadRequestException(
        `Exceeded maximum medications per drone. Limit: ${this.MAX_MEDICATIONS_PER_DRONE}`,
      );
    }

    const medications = await this.medicationRepository.all({
      conditions: {
        _id: { $in: uniqueMedicationIds },
      },
    });
    if (medications.length !== uniqueMedicationIds.length) {
      throw new BadRequestException('One or more medications not found');
    }

    return medications;
  }

  async validateDroneForLoading(droneId: string): Promise<Drone> {
    const drone = await this.droneRepository.byQuery({ _id: droneId });
    if (!drone) {
      throw new BadRequestException('Drone not found');
    }
    const { remainingCapacity } = await this.calculateRemainingWeight(drone);
    if (drone.state === DroneStates.Loaded && remainingCapacity > 0) {
      return drone;
    }
    if (drone.state !== DroneStates.Idle) {
      throw new BadRequestException(
        `Cannot load drone. Current state: ${drone.state}`,
      );
    }

    if (drone.battery < this.MIN_BATTERY_THRESHOLD) {
      throw new BadRequestException(
        `Drone battery too low. Current: ${drone.battery}%. Minimum: ${this.MIN_BATTERY_THRESHOLD}%`,
      );
    }
    return drone;
  }

  async updateDroneState(droneId: string, state: DroneStates) {
    let opts = {
      $set: { state },
    };
    if (state === DroneStates.Loaded) {
      opts['$inc'] = { battery: -17 }; // just to simulate the drone being in operation and the battery health reduces..
    }
    return this.droneRepository.updateWithOperators({ _id: droneId }, opts);
  }

  async loadDroneMedications(
    droneId: string,
    medicationIds: string[],
  ): Promise<Orders[]> {
    const drone = await this.validateDroneForLoading(droneId);
    const medications = await this.validateMedications(medicationIds);
    await this.performLoadChecks(drone, medications);
    return await this.createDroneOrders(drone, medications);
  }

  async getDroneById(id: string) {
    const drone = await this.droneRepository.byID(id);
    if (!drone) {
      throw new NotFoundException(`Drone with ID ${id} not found`);
    }
    return {
      id: drone.id,
      serialNumber: drone.serialNumber,
      model: drone.droneModel,
      state: drone.state,
      weight: drone.weight,
      battery: drone.battery,
    };
  }

  async getDroneWithOrders(droneId: string) {
    const orders = await this.ordersRepository.getOrders(droneId);
    if (!orders)
      throw new NotFoundException(
        `Drone with this given serial ${droneId} does not have any current order`,
      );
    return orders;
  }

  async getAvailableDrones() {
    const drones = await this.droneRepository.all({
      conditions: { state: { $eq: DroneStates.Idle } },
    });
    return drones.map((drone) => {
      return {
        id: drone.id,
        serialNumber: drone.serialNumber,
        model: drone.droneModel,
        state: drone.state,
        weight: drone.weight,
        battery: drone.battery,
      };
    });
  }

  async getDroneBatteryHealth(id: string) {
    const drone = await this.droneRepository.byID(id);
    if (!drone) {
      throw new NotFoundException('Drone does not exist.');
    }
    return { battery: drone.battery ?? 0 };
  }
}
