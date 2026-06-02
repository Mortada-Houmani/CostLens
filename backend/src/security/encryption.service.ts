import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ENCRYPTION_PREFIX = 'enc:v1';

@Injectable()
export class EncryptionService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      ENCRYPTION_PREFIX,
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(value: string): string {
    const [prefix, version, iv, authTag, encrypted] = value.split(':');
    const storedPrefix = `${prefix}:${version}`;

    if (storedPrefix !== ENCRYPTION_PREFIX || !iv || !authTag || !encrypted) {
      throw new InternalServerErrorException(
        'Stored AWS secret is not encrypted',
      );
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getKey(),
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getKey(): Buffer {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY is not configured',
      );
    }

    return createHash('sha256').update(encryptionKey).digest();
  }
}
