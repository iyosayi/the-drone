import { IsNotEmpty } from "class-validator";

export class ParamIdRequired {
    @IsNotEmpty({ message: 'Drone ID is required' })
    medicationId: string;
  }