import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiConfigService } from './ai-config.service';
import { ChatStreamDto } from './dto/chat-stream.dto';
import { LlmMessage } from './providers/llm-provider.interface';
import { ProviderRegistry } from './providers/provider.registry';
import { RateLimitService } from './rate-limit.service';

/** §4.4.2 第 4 步：Socratic 模式固定注入的引导指令 */
const SOCRATIC_GUIDE =
  '你是一个苏格拉底式的引导者。永远不要直接给出最终答案。将答案拆解成一系列反问和引导性问题，逐步启发用户自己得出结论。';

/** 多轮上下文最多携带的历史条数（防 token 膨胀） */
const MAX_HISTORY = 10;

/**
 * AI 对话编排（§4.4.2）：限流 → 加载配置 → 聚合知识库上下文 →
 * 组装 Prompt → Provider 流式调用（失败重试最多 2 次，§4.4.3）。
 * 对话不落库（§4.3.2 拍板）。
 */
@Injectable()
export class AiChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configs: AiConfigService,
    private readonly registry: ProviderRegistry,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** 产出文本增量流；首字节前失败自动重试，之后失败直接抛出由控制器转 SSE 错误帧 */
  async *streamChat(dto: ChatStreamDto): AsyncGenerator<string> {
    this.rateLimit.assertAllowed(dto.courseId);

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true, title: true, currentReleaseId: true },
    });
    if (!course) throw new NotFoundException('课程不存在');

    const [runtime, prompts, context] = await Promise.all([
      this.configs.resolveRuntime(dto.courseId),
      this.configs.resolvePrompts(dto.courseId, dto.mode),
      this.buildContext(course.currentReleaseId),
    ]);

    const systemParts = [prompts.systemPrompt];
    if (dto.mode === 'SOCRATIC') systemParts.push(SOCRATIC_GUIDE);
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: [
          systemParts.filter(Boolean).join('\n\n'),
          '[CONTEXT_START]',
          context,
          '[CONTEXT_END]',
        ].join('\n'),
      },
      ...(dto.history ?? []).slice(-MAX_HISTORY),
      { role: 'user', content: dto.message },
    ];

    const provider = this.registry.get(runtime.provider);
    const MAX_RETRIES = 2;
    let attempt = 0;
    while (true) {
      attempt += 1;
      let started = false;
      try {
        const gen = provider.stream({
          model: runtime.model,
          messages,
          apiKey: runtime.apiKey,
          baseUrl: runtime.baseUrl,
        });
        for await (const delta of gen) {
          started = true;
          yield delta;
        }
        return;
      } catch (err) {
        // 仅首字节前且未超重试上限才重试（§4.4.3）
        if (started || attempt > MAX_RETRIES) throw err;
      }
    }
  }

  /**
   * 知识库上下文聚合（§4.4.2 第 3 步，2026-10-15 拍板改 §4.3.3）：
   * 读 Course.currentReleaseId 指向的激活 Release 快照，不再读实时草稿——
   * Publish 后未再次发布的编辑不影响 AI。快照本身已在发布时过滤 STALE 节点
   * （§3.4.3），此处无需再过滤。未发布过的课程直接报错交用户在 Knowledge 发布。
   */
  private async buildContext(
    currentReleaseId: string | null,
  ): Promise<string> {
    if (!currentReleaseId) {
      throw new BadRequestException(
        '该课程尚未发布知识库版本，请先在 Knowledge 模块 Publish',
      );
    }
    const release = await this.prisma.release.findUnique({
      where: { id: currentReleaseId },
      select: { snapshotData: true },
    });
    if (!release) {
      throw new BadRequestException(
        '该课程尚未发布知识库版本，请先在 Knowledge 模块 Publish',
      );
    }
    const snapshot = release.snapshotData as unknown as {
      lessons?: {
        title: string;
        pages?: { title: string; contentMd?: string }[];
      }[];
    };
    const blocks: string[] = [];
    for (const lesson of snapshot?.lessons ?? []) {
      for (const page of lesson.pages ?? []) {
        const content = page.contentMd?.trim();
        if (!content) continue;
        blocks.push(`## ${lesson.title} / ${page.title}\n${content}`);
      }
    }
    return blocks.join('\n\n');
  }
}
