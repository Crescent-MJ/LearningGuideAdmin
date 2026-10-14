import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmProvider } from './llm-provider.interface';
import { OpenRouterProvider } from './openrouter.provider';

/**
 * Provider 注册表（策略模式收口，§1.3 架构原则 1）。
 * 新增 Provider：实现 LlmProvider → 在此注册，业务代码零改动。
 */
@Injectable()
export class ProviderRegistry {
  private readonly providers = new Map<string, LlmProvider>();

  constructor(openrouter: OpenRouterProvider) {
    this.providers.set(openrouter.name, openrouter);
  }

  get(name: string): LlmProvider {
    const p = this.providers.get(name);
    if (!p) {
      throw new BadRequestException(`不支持的 LLM Provider: ${name}`);
    }
    return p;
  }
}
