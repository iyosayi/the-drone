import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medication } from './entities/medication.entity';

@Injectable()
export class MedicationSeeder {
  constructor(
    @InjectModel(Medication.name)
    private readonly medicationModel: Model<Medication>
  ) {}
  private generateMedicationCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    // Generate a code with 2 letters, 3 numbers, and optional underscore
    const randomLetters = Array.from({length: 2}, () => 
      letters[Math.floor(Math.random() * letters.length)]
    ).join('');
    
    const randomNumbers = Array.from({length: 3}, () => 
      numbers[Math.floor(Math.random() * numbers.length)]
    ).join('');
    
    const underscore = Math.random() > 0.5 ? '_' : '';
    
    return `${randomLetters}${underscore}${randomNumbers}`;
  }
  private generateMedicationName(): string {
    const prefixes = [
      'Aceta', 'Benz', 'Cipro', 'Detra', 'Ery', 'Flex', 
      'Genta', 'Hydro', 'Ibupro', 'Lyrica', 'Metro', 
      'Norva', 'Omepra', 'Parace', 'Quini', 'Ranixa', 
      'Sertra', 'Trama', 'Urbaso', 'Ventolin'
    ];
    
    const suffixes = [
      '-100', '-200', '-250', '-500', '_XR', '-50', 
      '-75', '_SR', '-20', '-10'
    ];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${suffix}`;
  }

  async seed() {
    const existingMedicationsCount = await this.medicationModel.countDocuments();
    if (existingMedicationsCount > 0) {
      console.log('Medications already seeded. Skipping...');
      return;
    }

    const medicationsToSeed = Array.from({length: 40}, (_, index) => {
      const name = this.generateMedicationName();
      
      return {
        name,
        weight: this.generateWeight(),
        code: this.generateMedicationCode(),
        image: `medication_${index + 1}.jpg`
      };
    });

    try {
      const uniqueMedications = this.ensureUniqueness(medicationsToSeed);
      const medications = await this.medicationModel.create(uniqueMedications);
      console.log(`Successfully seeded ${medications.length} medications`);
    } catch (error) {
      console.error('Error seeding medications:', error);
      throw error;
    }
  }

  private generateWeight(): number {
    const weights = [10, 20, 50, 75, 100, 200, 250, 500, 750, 1000];
    return weights[Math.floor(Math.random() * weights.length)];
  }

  private ensureUniqueness(medications: Partial<Medication>[]): Partial<Medication>[] {
    const uniqueCodes = new Set<string>();
    const uniqueNames = new Set<string>();
    
    return medications.filter(med => {
      if (uniqueCodes.has(med.code) || uniqueNames.has(med.name)) {
        return false;
      }
      uniqueCodes.add(med.code);
      uniqueNames.add(med.name);
      
      return true;
    });
  }
}