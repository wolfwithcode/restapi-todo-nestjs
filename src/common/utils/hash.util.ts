import { createHash } from 'crypto';

/**
 * Utility class for handling SHA-256 hash operations
 */
export class HashUtil {
  /**
   * Generate a SHA-256 hash of the provided data
   * 
   * @param data Any data that can be converted to string
   * @returns SHA-256 hash as hexadecimal string
   */
  static generateSHA256(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify if the provided hash matches the hash of the data
   * 
   * @param data Data to verify
   * @param hash Expected hash
   * @returns Boolean indicating if hash matches
   */
  static verifySHA256(data: any, hash: string): boolean {
    const calculatedHash = this.generateSHA256(data);
    return calculatedHash === hash;
  }
} 