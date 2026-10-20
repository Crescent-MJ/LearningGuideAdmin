import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiChatService } from './ai-chat.service';
import { AiConfigService } from './ai-config.service';
import { ChatStreamDto } from './dto/chat-stream.dto';
import { SaveAiConfigDto } from './dto/save-config.dto';
import { ResetAiConfigDto } from './dto/reset-config.dto';
import { SetOnlineDto } from './dto/set-online.dto';
import { SetActiveReleaseDto } from './dto/set-active-release.dto';

/**
 * AI Tutor 后端接口（开发文档 §5.2）。
 * 所有 AI 请求必须经本控制器代理（§9.2：前端禁止直连 LLM API）。
 */
@Controller('ai')
export class AiController {
  constructor(
    private readonly configs: AiConfigService,
    private readonly chat: AiChatService,
  ) {}

  /** 可用模型列表（§4.2.3，数据源 AI_AVAILABLE_MODELS env） */
  @Get('models')
  listModels() {
    return this.configs.availableModels();
  }

  /** 默认 PromptTemplate 列表（§4.2.4 Reset 依据） */
  @Get('prompts')
  listPrompts() {
    return this.configs.listPrompts();
  }

  /** 某课程 AI 配置（apiKey 脱敏，§5.2） */
  @Get('config/:courseId')
  getConfig(@Param('courseId') courseId: string) {
    return this.configs.getConfig(courseId);
  }

  /** 保存配置（§4.2.5） */
  @Put('config')
  saveConfig(@Body() dto: SaveAiConfigDto) {
    return this.configs.saveConfig(dto);
  }

  /** 重置为默认模板（§4.2.4；2026-10-20 二次改拍：body 带 mode，只重置该模式） */
  @Post('config/:courseId/reset')
  resetConfig(
    @Param('courseId') courseId: string,
    @Body() dto: ResetAiConfigDto,
  ) {
    return this.configs.resetConfig(courseId, dto.mode);
  }

  /** 设置「测试所选 Release」（§4.3.1/§5.2，2026-10-20 新增，持久化 Course.aiTestReleaseId） */
  @Put('config/:courseId/active-release')
  setActiveRelease(
    @Param('courseId') courseId: string,
    @Body() dto: SetActiveReleaseDto,
  ) {
    return this.configs.setActiveRelease(courseId, dto.releaseId);
  }

  /** 设置 Online 状态（§4.2.6，开关即时生效） */
  @Put('config/:courseId/online')
  setOnline(
    @Param('courseId') courseId: string,
    @Body() dto: SetOnlineDto,
  ) {
    return this.configs.setOnline(courseId, dto.online);
  }

  /** 列出全部 AI Tutor 及 Online 状态（§4.2.6，「管理所有 online」弹窗数据源） */
  @Get('tutors')
  listTutors() {
    return this.configs.listTutors();
  }

  /**
   * 流式对话 SSE（§4.4.1/§4.4.2）。
   * 手动接管 Response（不走 §5.3 JSON 信封，即 Phase 2 预留的 SSE 豁免点）：
   * 先消费首增量——限流/校验/配置类错误在响应头发出前抛出，仍由全局过滤器
   * 输出标准错误信封；流中途失败则下发 error 帧后结束。
   */
  @Post('chat-stream')
  async chatStream(@Body() dto: ChatStreamDto, @Res() res: Response) {
    const gen = this.chat.streamChat(dto);
    const first = await gen.next(); // 首字节前错误 → 交给过滤器

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const write = (obj: unknown) =>
      res.write(`data: ${JSON.stringify(obj)}\n\n`);

    if (!first.done) write({ delta: first.value });
    try {
      for await (const delta of gen) write({ delta });
      write({ done: true });
    } catch (err) {
      write({
        error:
          err instanceof HttpException
            ? err.message
            : 'AI 服务暂时不可用，请稍后重试',
      });
    } finally {
      res.end();
    }
  }
}

/**
 * 预留：用户侧 AI Tutor 接口（§4.2.6/§5.2，2026-10-20 拍板）。
 * 仅预留路由与 Service 方法，**不实现业务逻辑**，供后续学生端接入。
 */
@Controller('user')
export class UserAiController {
  constructor(private readonly configs: AiConfigService) {}

  /** 用户侧读取 Online AI Tutor 列表（预留钩子，当前返回 501 未实现） */
  @Get('ai-tutors')
  listOnlineTutors() {
    return this.configs.listOnlineTutorsForUser();
  }
}
