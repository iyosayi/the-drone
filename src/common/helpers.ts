import { SequenceService } from '@modules/drones/sequence.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelperMethods {
  constructor(private readonly sequenceService: SequenceService) {}
  private readonly PREFIX = 'DRN'; // Drone prefix
  /**
   * Generates a check digit using Luhn algorithm modified for alphanumeric values
   * This helps detect transcription errors
   */
  private generateCheckDigit(input: string): string {
    // Convert alphanumeric to numbers (A=10, B=11, etc)
    const values = input.split('').map((char) => {
      if (/[0-9]/.test(char)) return parseInt(char);
      return char.charCodeAt(0) - 55; // A=10, B=11, etc
    });

    // Luhn algorithm implementation
    let sum = 0;
    let alternate = false;

    for (let i = values.length - 1; i >= 0; i--) {
      let n = values[i];
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Converts a number to base36 (0-9 + A-Z)
   * This gives us a more compact representation
   */
  private toBase36(num: number): string {
    return num.toString(36).toUpperCase();
  }

  /**
   * Generates a unique serial number with the format:
   * PREFIX + YEAR + SEQUENCE + CHECK_DIGIT
   * Example: DRN24A1B2C3D4E5X
   */
  async generateSerialNumber(length: number = 15): Promise<string> {
    // Get year (last 2 digits)
    const year = new Date().getFullYear().toString().slice(-2);

    // Get next sequence number and convert to base36
    const sequence = await this.sequenceService.getNextSequenceValue();
    const base36Sequence = this.toBase36(sequence);

    // Pad the sequence with zeros if needed
    const paddedSequence = base36Sequence.padStart(
      length - this.PREFIX.length - 2 - 1,
      '0',
    );

    // Combine parts without check digit
    const serialWithoutCheck = `${this.PREFIX}${year}${paddedSequence}`;

    // Generate and append check digit
    const checkDigit = this.generateCheckDigit(serialWithoutCheck);

    return `${serialWithoutCheck}${checkDigit}`;
  }

  /**
   * Validates a serial number including its check digit
   */
  private isValidSerial(serialNumber: string): boolean {
    const inputDigit = serialNumber.slice(-1);
    const calculatedDigit = this.generateCheckDigit(serialNumber.slice(0, -1));
    return inputDigit === calculatedDigit;
  }
}
