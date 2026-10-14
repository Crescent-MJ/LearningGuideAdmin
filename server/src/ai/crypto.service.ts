import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * CourseAiConfig.apiKey 加密服务（§2 红线：apiKey 敏感字段必须加密存储；
 * §12 拍板 2026-10-14：AES-256-GCM，密钥经环境变量 AI_CONFIG_ENCRYPTION_KEY 注入）。
 * 密文格式：iv(12B hex):authTag(16B hex):ciphertext(hex)。
 * 解密结果仅在内存中供 Provider 调用使用，绝不返回给任何接口。
 */
@Injectable()
export class CryptoService {
  constructor(private readonly config: ConfigService) {}

  private getKey(): Buffer {
    const raw = this.config.get<string>('AI_CONFIG_ENCRYPTION_KEY');
    if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new InternalServerErrorException(
        'AI_CONFIG_ENCRYPTION_KEY 未配置或格式错误（需 64 位 hex）',
      );
    }
    return Buffer.from(raw, 'hex');
  }

  encrypt(plain: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const key = this.getKey();
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new InternalServerErrorException('apiKey 密文格式非法');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
