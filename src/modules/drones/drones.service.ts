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
  private readonly MAX_WEIGHT_LIMIT = 500;
  private readonly MIN_BATTERY_THRESHOLD = 25;
  private readonly MAX_MEDICATIONS_PER_DRONE = 5;

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
  private async createDroneOrders(
    drone: Drone,
    medications: Medication[],
  ): Promise<Orders[]> {
    const bulkInsertOpts = medications.map((med) => ({
      drone: drone.id,
      medication: med.id,
    }));
    // @ts-ignore
    await this.ordersRepository.createMany(bulkInsertOpts);
    this.updateDroneState(drone.id, DroneStates.Loaded)
    return this.ordersRepository.getOrders(drone.id)
  }

  private performLoadChecks(drone: Drone, medications: Medication[]): void {
    const totalWeight = medications.reduce(
      (sum, medication) => sum + medication.weight,
      0,
    );

    if (totalWeight > this.MAX_WEIGHT_LIMIT) {
      throw new BadRequestException(
        `Total medication weight (${totalWeight}g) exceeds drone limit (${this.MAX_WEIGHT_LIMIT}g)`,
      );
    }

    switch (drone.droneModel) {
      case DroneModelEnum.LightWeight:
        if (totalWeight > 150) {
          throw new BadRequestException(
            'Weight exceeds Lightweight drone capacity',
          );
        }
        break;
      case DroneModelEnum.Middleweight:
        if (totalWeight > 300) {
          throw new BadRequestException(
            'Weight exceeds Middleweight drone capacity',
          );
        }
        break;
      case DroneModelEnum.Cruiserweight:
        if (totalWeight > 400) {
          throw new BadRequestException(
            'Weight exceeds Cruiserweight drone capacity',
          );
        }
        break;
      case DroneModelEnum.Heavyweight:
        if (totalWeight > 500) {
          throw new BadRequestException(
            'Weight exceeds Cruiserweight drone capacity',
          );
        }
        break;
    }
  }

  private async validateMedications(
    medicationIds: string[],
  ): Promise<Medication[]> {
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

  private async validateDroneForLoading(serialNumber: string): Promise<Drone> {
    const drone = await this.droneRepository.byQuery({ serialNumber });
    if (!drone) {
      throw new BadRequestException('Drone not found');
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
    this.updateDroneState(drone.id, DroneStates.Loading);
    return drone;
  }

  async updateDroneState(droneId: string, state: DroneStates) {
    return this.droneRepository.update({ _id: droneId }, { state });
  }

  async loadDroneMedications(
    serialNumber: string,
    medicationIds: string[],
  ): Promise<Orders[]> {
    const drone = await this.validateDroneForLoading(serialNumber);
    const medications = await this.validateMedications(medicationIds);
    this.performLoadChecks(drone, medications);
    return await this.createDroneOrders(drone, medications);
  }

  async getDroneById(id: string) {
    const drone = await this.droneRepository.byID(id, null);
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

  getAvailableDrones() {
    return this.droneRepository.all({
      conditions: { state: { $eq: DroneStates.Idle } },
    });
  }

  async getDroneBatteryHealth(id: string) {
    const drone = await this.droneRepository.byID(id);
    if(!drone) {
      throw new NotFoundException('Drone does not exist.')
    }
    return {battery: drone.battery ?? 0 }
  }
}
