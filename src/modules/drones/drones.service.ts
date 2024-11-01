import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDroneDto, LoadDroneDto } from './dto/create-drone.dto';
import { DronesRepository } from './repository/drone.repository';
import { HelperMethods } from '@common/helpers';
import { DroneStates } from '@common/enums';
import { MedicationRepository } from '@modules/medications/repository/medication.repository';
import { OrdersRepository } from './repository/orders.repository';

@Injectable()
export class DronesService {
  constructor(
    private readonly droneRepository: DronesRepository,
    private readonly medicationRepository: MedicationRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly helperMethods: HelperMethods,
  ) {}
  async create(createDroneDto: CreateDroneDto) {
    try {
      const serial = await this.helperMethods.generateSerialNumber();
      const drone = await this.droneRepository.create({serialNumber: serial, ...createDroneDto});
      return this.getDroneById(drone.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async loadDroneWithItem(data: LoadDroneDto) {
    // to load a drone, we need to consider the following
    /**
     * 1. is the drone free? i.e the state of the drone
     * 2. does the drone have enough power for delivery
     * 3. does the drone support the weight of the medication
     */
    try {
      const drone = await this.droneRepository.byQuery({
        serialNumber: data.droneSerialNumber,
      });
      if (!drone) {
        throw new NotFoundException(
          'Drone with the given serial does not exist',
        );
      }
      if (![DroneStates.Idle].includes(drone.state)) {
        throw new BadRequestException(
          'Cannot laod items, drone not available for dispatch',
        );
      }
      if (drone.battery < 25) {
        throw new BadRequestException(
          'Cannot load items, drone does not have sufficent power for this delivery',
        );
      }
      const medication = await this.medicationRepository.byQuery({
        code: data.medication.code,
      });
      if (!medication) {
        throw new NotFoundException(
          `Medication with the given code ${data?.medication?.code} not found`,
        );
      }
      if (medication.weight > 500) {
        throw new BadRequestException('Maximum weight allowed is 500');
      }
      await this.ordersRepository.loadDrone(data);
      await this.droneRepository.update(
        { _id: drone.id },
        { state: DroneStates.Loaded },
      );
      const loadedDrone = await this.getDroneById(drone.id);
    } catch (error) {}
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
      conditions: { state: { $ne: DroneStates.Idle } },
    });
  }

  async getDroneBatteryHealth(id: string) {
    const drone = await this.droneRepository.byID(id, 'battery')
    return drone?.battery
  }
}
