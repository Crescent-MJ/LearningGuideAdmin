import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CourseAiConfig, PromptTemplate } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { SaveAiConfigDto } from './dto/save-config.dto';

/** 对外的 AI 配置视图：apiKey 永不明文返回（§2 红线），只暴露是否已配置 */
export interface AiConfigView {
  courseId: string;
  llmProvider: string;
  llmModel: string;
  customSystemPrompt: string | null;
  customWelcomeMsg: string | null;
  lectureTemplateId: string | null;
  socraticTemplateId: string | null;
  hasApiKey: boolean;
  /** 当前课程激活版本的 versionTag（§4.3.1 对话头部展示） */
  currentReleaseTag: string | null;
}

export interface ResolvedPrompts {
  systemPrompt: string;
  welcomeMsg: string;
}

@Injectable()
export class AiConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  defaultModel(): string {
    return this.availableModels()[0] ?? 'openai/gpt-4o-mini';
  }

  availableModels(): string[] {
    const raw = this.config.get<string>('AI_AVAILABLE_MODELS') ?? '';
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length > 0 ? list : ['openai/gpt-4o-mini'];
  }

  async listPrompts(): Promise<PromptTemplate[]> {
    return this.prisma.promptTemplate.findMany({
      where: { isDefault: true },
      orderBy: { mode: 'asc' },
    });
  }

  /** §5.2：获取某 Course 的 AI 配置（无记录时返回默认视图） */
  async getConfig(courseId: string): Promise<AiConfigView> {
    const course = await this.ensureCourse(courseId);
    const cfg = await this.prisma.courseAiConfig.findUnique({
      where: { courseId },
    });
    return await this.toView(courseId, cfg, course.currentReleaseId);
  }

  /** §4.2.5：保存配置（apiKey 加密入库；省略=不变、空串=清除） */
  async saveConfig(dto: SaveAiConfigDto): Promise<AiConfigView> {
    const course = await this.ensureCourse(dto.courseId);
    const existing = await this.prisma.courseAiConfig.findUnique({
      where: { courseId: dto.courseId },
    });

    let apiKeyField = existing?.apiKey ?? null;
    if (dto.apiKey !== undefined) {
      apiKeyField = dto.apiKey === '' ? null : this.crypto.encrypt(dto.apiKey);
    }

    const data = {
      llmProvider: dto.llmProvider,
      llmModel: dto.llmModel,
      customSystemPrompt: dto.customSystemPrompt ?? null,
      customWelcomeMsg: dto.customWelcomeMsg ?? null,
      apiKey: apiKeyField,
    };
    const cfg = await this.prisma.courseAiConfig.upsert({
      where: { courseId: dto.courseId },
      create: { courseId: dto.courseId, ...data },
      update: data,
    });
    return await this.toView(dto.courseId, cfg, course.currentReleaseId);
  }

  /** §4.2.4：重置 = 清除自定义覆盖，恢复默认模板 */
  async resetConfig(courseId: string): Promise<AiConfigView> {
    const course = await this.ensureCourse(courseId);
    const cfg = await this.prisma.courseAiConfig.upsert({
      where: { courseId },
      create: {
        courseId,
        llmProvider: 'openrouter',
        llmModel: this.defaultModel(),
      },
      update: {
        customSystemPrompt: null,
        customWelcomeMsg: null,
        lectureModeId: null,
        socraticModeId: null,
      },
    });
    return await this.toView(courseId, cfg, course.currentReleaseId);
  }

  /**
   * 对话用有效提示词解析（§4.4.2 第 4 步）：
   * 自定义 > 课程绑定模板 > 默认模板（isDefault）。
   */
  async resolvePrompts(
    courseId: string,
    mode: 'LECTURE' | 'SOCRATIC',
  ): Promise<ResolvedPrompts> {
    const cfg = await this.prisma.courseAiConfig.findUnique({
      where: { courseId },
    });
    const templateId =
      mode === 'LECTURE' ? cfg?.lectureModeId : cfg?.socraticModeId;
    const template = templateId
      ? await this.prisma.promptTemplate.findUnique({ where: { id: templateId } })
      : await this.prisma.promptTemplate.findFirst({
          where: { mode, isDefault: true },
        });
    return {
      systemPrompt: cfg?.customSystemPrompt || template?.systemPrompt || '',
      welcomeMsg: cfg?.customWelcomeMsg || template?.welcomeMsg || '',
    };
  }

  /** 对话用运行参数：Provider/模型/明文 key（课程级解密，回退 env 全局）/baseUrl */
  async resolveRuntime(courseId: string): Promise<{
    provider: string;
    model: string;
    apiKey: string;
    baseUrl: string;
  }> {
    const cfg = await this.prisma.courseAiConfig.findUnique({
      where: { courseId },
    });
    const apiKey = cfg?.apiKey
      ? this.crypto.decrypt(cfg.apiKey)
      : (this.config.get<string>('OPENROUTER_API_KEY') ?? '');
    if (!apiKey) {
      throw new NotFoundException(
        '未配置可用的 LLM API Key（课程级未设置且 OPENROUTER_API_KEY 缺失）',
      );
    }
    return {
      provider: cfg?.llmProvider ?? 'openrouter',
      model: cfg?.llmModel ?? this.defaultModel(),
      apiKey,
      baseUrl:
        this.config.get<string>('OPENROUTER_BASE_URL') ??
        'https://openrouter.ai/api/v1',
    };
  }

  private async toView(
    courseId: string,
    cfg: CourseAiConfig | null,
    currentReleaseId: string | null,
  ): Promise<AiConfigView> {
    let currentReleaseTag: string | null = null;
    if (currentReleaseId) {
      const release = await this.prisma.release.findUnique({
        where: { id: currentReleaseId },
        select: { versionTag: true },
      });
      currentReleaseTag = release?.versionTag ?? null;
    }
    return {
      courseId,
      llmProvider: cfg?.llmProvider ?? 'openrouter',
      llmModel: cfg?.llmModel ?? this.defaultModel(),
      customSystemPrompt: cfg?.customSystemPrompt ?? null,
      customWelcomeMsg: cfg?.customWelcomeMsg ?? null,
      lectureTemplateId: cfg?.lectureModeId ?? null,
      socraticTemplateId: cfg?.socraticModeId ?? null,
      hasApiKey: Boolean(cfg?.apiKey),
      currentReleaseTag,
    };
  }

  private async ensureCourse(courseId: string): Promise<{ id: string; currentReleaseId: string | null }> {
    const found = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, currentReleaseId: true },
    });
    if (!found) throw new NotFoundException('课程不存在');
    return found;
  }
}
