// sequence.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SequenceRepository } from './repository/sequence.repository';

@Injectable()
export class SequenceService implements OnModuleInit {
  private readonly logger = new Logger(SequenceService.name);

  constructor(
    private sequenceRepository: SequenceRepository
  ) {}

  /**
   * Initializes when the module starts.
   * Creates the sequence if it doesn't exist.
   */
  async onModuleInit() {
    try {
      await this.initializeDroneSequence();
      this.logger.log('Drone sequence initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize drone sequence', error.stack);
      throw error;
    }
  }

  /**
   * Initialize drone sequence if it doesn't exist
   */
  private async initializeDroneSequence(): Promise<void> {
    const sequenceName = 'droneSequence';
    
    const existing = await this.sequenceRepository.byQuery({ sequenceName });
    
    if (!existing) {
      this.logger.log('Creating new drone sequence');
      await this.sequenceRepository.create({
        sequenceName,
        currentValue: 0,
        prefix: 'DRN',
        increment: 1,
        createdAt: new Date(),
        lastUpdated: new Date(),
        metadata: {
          purpose: 'drone_serial',
          version: '1.0'
        }
      });
    }
    this.logger.log('Sequence created successfully')
  }

  /**
   * Get next sequence value with atomic increment
   */
  async getNextSequenceValue(): Promise<number> {
    const sequenceName = 'droneSequence';
    
    const result = await this.sequenceRepository.updateWithOperators(
      { sequenceName },
      { 
        $inc: { currentValue: 1 },
        $set: { lastUpdated: new Date() }
      },
      { 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    if (!result) {
      throw new Error('Failed to get next sequence value - sequence not found');
    }

    return result.currentValue;
  }

  /**
   * Get current sequence value without incrementing
   */
  async getCurrentValue(): Promise<number> {
    const sequence = await this.sequenceRepository.byQuery({ 
      sequenceName: 'droneSequence' 
    });
    return sequence?.currentValue ?? 0;
  }
}
