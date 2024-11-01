import { Controller, Post, Body } from '@nestjs/common';
import { DronesService } from './drones.service';
import { CreateDroneDto } from './dto/create-drone.dto';

@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService) {}

  @Post()
  async create(@Body() createDroneDto: CreateDroneDto) {
    return this.dronesService.create(createDroneDto);
  }

  // @Get()
  // findAll() {
  //   return this.dronesService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.dronesService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateDroneDto: UpdateDroneDto) {
  //   return this.dronesService.update(+id, updateDroneDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.dronesService.remove(+id);
  // }
}
