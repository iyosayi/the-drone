import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsObject,
  IsNotEmpty,
  IsArray
} from 'class-validator';
import { DroneModelEnum } from '@common/enums';
import { Transform } from 'class-transformer'


export class CreateDroneDto {
  @IsString()
  @IsEnum(DroneModelEnum, {
    message:
      'Model must be one of LightWeight, Middleweight, Cruiserweight, Heavyweight',
  })
  droneModel: DroneModelEnum;

  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  @IsInt()
  @Min(1)
  @Max(525)
  weight: number;
}

export class LoadDroneDto {
  @IsArray()
  @IsNotEmpty()
  medications: string[]
}

export class DroneIdRequired {
  @IsNotEmpty({ message: 'Drone ID is required' })
  droneId: string;
}