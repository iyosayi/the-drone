import { Controller, Post, Body, Param, Get, ValidationPipe, BadRequestException } from '@nestjs/common';
import { DronesService } from './drones.service';
import { CreateDroneDto, DroneIdRequired, LoadDroneDto } from './dto/create-drone.dto';
import { HelperMethods } from '@common/helpers';

@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService, private readonly helperMethods: HelperMethods) {}

  @Get('battery-health/:droneId')
  async getDroneBatteryHealth(@Param(new ValidationPipe()) params: DroneIdRequired) {
    if (!params.droneId) {
      throw new BadRequestException('Drone ID is required');
    }
    const response = await this.dronesService.getDroneBatteryHealth(params.droneId);
    return this.helperMethods.sendSuccessResponse(response, 'Drone battery gotten successfully')
  }

  @Post()
  async create(@Body() createDroneDto: CreateDroneDto) {
    const createdDrone = await this.dronesService.create(createDroneDto);
    return this.helperMethods.sendSuccessResponse(createdDrone, 'Drone created successfully')
  }

  @Post(':droneId/load')
  async loadDrones(@Body() body: LoadDroneDto, @Param(new ValidationPipe()) params: DroneIdRequired) {
    const response = await this.dronesService.loadDroneMedications(params.droneId, body.medications);
    return this.helperMethods.sendSuccessResponse(response, 'Drone loaded successfully')
  }
  @Get('available')
  async getDronesAvailableForLoading() {
    const response = await this.dronesService.getAvailableDrones();
    return this.helperMethods.sendSuccessResponse(response, 'Available drones retrieved successfully')
  }

  @Get('details/:droneId')
  async getDrone(@Body() body: LoadDroneDto, @Param(new ValidationPipe()) params: DroneIdRequired) {
    const response = await this.dronesService.getDroneWithOrders(params.droneId);
    return this.helperMethods.sendSuccessResponse(response, 'Drone gotten successfully')
  }
}