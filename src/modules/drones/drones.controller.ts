import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { DronesService } from './drones.service';
import { CreateDroneDto, LoadDroneDto } from './dto/create-drone.dto';
import { HelperMethods } from '@common/helpers';

@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService, private readonly helperMethods: HelperMethods) {}

  @Get('battery-health/:droneId')
  async getDroneBatteryHealth(@Param('droneId') droneId) {
    const response = await this.dronesService.getDroneBatteryHealth(droneId);
    return this.helperMethods.sendSuccessResponse(response, 'Drone battery gotten successfully')
  }

  @Post()
  async create(@Body() createDroneDto: CreateDroneDto) {
    const createdDrone = await this.dronesService.create(createDroneDto);
    return this.helperMethods.sendSuccessResponse(createdDrone, 'Drone created successfully')
  }

  @Post(':serialNumber/load')
  async loadDrones(@Body() body: LoadDroneDto, @Param('serialNumber') serialNumber) {
    const response = await this.dronesService.loadDroneMedications(serialNumber, body.medications);
    return this.helperMethods.sendSuccessResponse(response, 'Drone loaded successfully')
  }
  @Get('available')
  async getDronesAvailableForLoading() {
    const response = await this.dronesService.getAvailableDrones();
    return this.helperMethods.sendSuccessResponse(response, 'Available drones retrieved successfully')
  }

  @Get(':droneId')
  async getDrone(@Body() body: LoadDroneDto, @Param('droneId') droneId) {
    const response = await this.dronesService.getDroneWithOrders(droneId);
    return this.helperMethods.sendSuccessResponse(response, 'Drone gotten successfully')
  }
}
