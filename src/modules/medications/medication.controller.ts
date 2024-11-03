import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  ValidationPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HelperMethods } from '@common/helpers';
import { MedicationRepository } from './repository/medication.repository';
import { ParamIdRequired } from './dto/create-medication.dto';

@Controller('medications')
export class MedicationController {
  constructor(
    private readonly medicationRepository: MedicationRepository,
    private readonly helperMethods: HelperMethods,
  ) {}

  @Get()
  async getMedications() {
    const data = await this.medicationRepository.all({});
    return this.helperMethods.sendSuccessResponse(
      data,
      'Medications retrieved successfully',
    );
  }
  @Get(':medicationId')
  async getMedicationById(@Param(new ValidationPipe()) params: ParamIdRequired) {
    if (!params.medicationId) {
      throw new BadRequestException('Medication invalid');
    }
    const medication = await this.medicationRepository.byID(params.medicationId);
    if (!medication) {
      throw new NotFoundException('Medication with this ID does not exist');
    }
    return this.helperMethods.sendSuccessResponse(
      medication.toJSON(),
      'Medications retrieved successfully',
    );
  }
}
