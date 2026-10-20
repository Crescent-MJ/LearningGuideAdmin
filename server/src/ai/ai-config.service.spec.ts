import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';

/**
 * AiConfigService 单元测试（§4.2.6 / §5.2，2026-10-20 按 Release 维度改拍）：
 * mock Prisma，聚焦 setOnline / listTutors / setActiveRelease / 无 Release 边界 / 预留钩子。
 */
describe('AiConfigService — Online & Release（§4.2.6/§5.2）', () => {
  const mockPrisma = {
    course: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    courseAiConfig: { findUnique: jest.fn(), upsert: jest.fn() },
    release: { findUnique: jest.fn() },
    promptTemplate: { findUnique: jest.fn(), findFirst: jest.fn() },
  };
  const mockCrypto = { encrypt: jest.fn(), decrypt: jest.fn() };
  const mockConfig = { get: jest.fn() };

  let service: AiConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.get.mockReturnValue('deepseek/deepseek-v4.1-flash');
    service = new AiConfigService(
      mockPrisma as unknown as PrismaService,
      mockCrypto as unknown as CryptoService,
      mockConfig as unknown as ConfigService,
    );
  });

  it('setOnline：写 Course.aiTutorOnline 并返回含 online 的视图', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: null,
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    mockPrisma.course.update.mockResolvedValue({
      id: 'c1',
      currentReleaseId: null,
      aiTestReleaseId: null,
      aiTutorOnline: true,
    });
    const view = await service.setOnline('c1', true);
    expect(view.online).toBe(true);
    expect(mockPrisma.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { aiTutorOnline: true },
      }),
    );
  });

  it('setOnline：课程不存在应 404', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);
    await expect(service.setOnline('x', true)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.course.update).not.toHaveBeenCalled();
  });

  it('listTutors：返回全部课程及 online 状态（读 Course.aiTutorOnline）', async () => {
    mockPrisma.course.findMany.mockResolvedValue([
      { id: 'c1', title: 'A', aiTutorOnline: true },
      { id: 'c2', title: 'B', aiTutorOnline: false },
    ]);
    const list = await service.listTutors();
    expect(list).toEqual([
      { courseId: 'c1', title: 'A', online: true },
      { courseId: 'c2', title: 'B', online: false },
    ]);
  });

  it('getConfig：回退 currentReleaseId，releaseId==currentReleaseId 时 isLive=true', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r1',
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    mockPrisma.courseAiConfig.findUnique.mockResolvedValue(null);
    mockPrisma.release.findUnique.mockResolvedValue({ versionTag: 'Course_20260101' });
    const view = await service.getConfig('c1');
    expect(view.releaseId).toBe('r1');
    expect(view.releaseTag).toBe('Course_20260101');
    expect(view.isLive).toBe(true);
  });

  it('getConfig：测试所选 Release 非上线版本时 isLive=false', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r2',
      aiTestReleaseId: 'r1',
      aiTutorOnline: false,
    });
    mockPrisma.courseAiConfig.findUnique.mockResolvedValue(null);
    mockPrisma.release.findUnique.mockResolvedValue({ versionTag: 'Course_20260101' });
    const view = await service.getConfig('c1');
    expect(view.releaseId).toBe('r1');
    expect(view.isLive).toBe(false);
  });

  it('getConfig：课程无任何 Release 时返回默认视图（releaseId/releaseTag=null、isLive=false）', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: null,
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    const view = await service.getConfig('c1');
    expect(view.releaseId).toBeNull();
    expect(view.releaseTag).toBeNull();
    expect(view.isLive).toBe(false);
    expect(mockPrisma.courseAiConfig.findUnique).not.toHaveBeenCalled();
  });

  it('setActiveRelease：校验归属后持久化 aiTestReleaseId 并返回视图', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r2',
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    mockPrisma.release.findUnique.mockResolvedValue({ id: 'r1', courseId: 'c1' });
    mockPrisma.course.update.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r2',
      aiTestReleaseId: 'r1',
      aiTutorOnline: false,
    });
    mockPrisma.courseAiConfig.findUnique.mockResolvedValue(null);
    const view = await service.setActiveRelease('c1', 'r1');
    expect(view.releaseId).toBe('r1');
    expect(view.isLive).toBe(false);
    expect(mockPrisma.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { aiTestReleaseId: 'r1' },
      }),
    );
  });

  it('setActiveRelease：Release 不属于该课程应 404', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: null,
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    mockPrisma.release.findUnique.mockResolvedValue({ id: 'r9', courseId: 'other' });
    await expect(service.setActiveRelease('c1', 'r9')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.course.update).not.toHaveBeenCalled();
  });

  it('saveConfig：无 Release 可绑定时应 400', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: null,
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    await expect(
      service.saveConfig({
        courseId: 'c1',
        mode: 'LECTURE',
        llmProvider: 'openrouter',
        llmModel: 'deepseek/deepseek-v4.1-flash',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.courseAiConfig.upsert).not.toHaveBeenCalled();
  });

  it('saveConfig：按模式只写该模式三列（LECTURE 不触碰 socratic）', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r1',
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    mockPrisma.courseAiConfig.findUnique.mockResolvedValue(null);
    mockPrisma.courseAiConfig.upsert.mockResolvedValue({
      lectureSystemPrompt: 'L',
      lectureWelcomeMsg: 'LW',
      lectureModel: 'm-lect',
      socraticSystemPrompt: null,
      socraticWelcomeMsg: null,
      socraticModel: null,
      llmProvider: 'openrouter',
      apiKey: null,
    });
    mockPrisma.release.findUnique.mockResolvedValue({ versionTag: 'v1' });
    const view = await service.saveConfig({
      courseId: 'c1',
      mode: 'LECTURE',
      llmProvider: 'openrouter',
      llmModel: 'm-lect',
      systemPrompt: 'L',
      welcomeMsg: 'LW',
    });
    const upsertArgs = mockPrisma.courseAiConfig.upsert.mock.calls[0][0];
    expect(upsertArgs.update).toEqual({
      llmProvider: 'openrouter',
      apiKey: null,
      lectureSystemPrompt: 'L',
      lectureWelcomeMsg: 'LW',
      lectureModel: 'm-lect',
    });
    expect(upsertArgs.update).not.toHaveProperty('socraticSystemPrompt');
    expect(view.lecture.model).toBe('m-lect');
    expect(view.socratic.model).toBe('deepseek/deepseek-v4.1-flash');
  });

  it('saveConfig：SOCRATIC 模式只写 socratic 三列', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r1',
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    mockPrisma.courseAiConfig.findUnique.mockResolvedValue(null);
    mockPrisma.courseAiConfig.upsert.mockResolvedValue({
      lectureSystemPrompt: null,
      lectureWelcomeMsg: null,
      lectureModel: null,
      socraticSystemPrompt: 'S',
      socraticWelcomeMsg: 'SW',
      socraticModel: 'm-soc',
      llmProvider: 'openrouter',
      apiKey: null,
    });
    mockPrisma.release.findUnique.mockResolvedValue({ versionTag: 'v1' });
    await service.saveConfig({
      courseId: 'c1',
      mode: 'SOCRATIC',
      llmProvider: 'openrouter',
      llmModel: 'm-soc',
      systemPrompt: 'S',
      welcomeMsg: 'SW',
    });
    const upsertArgs = mockPrisma.courseAiConfig.upsert.mock.calls[0][0];
    expect(upsertArgs.update).toEqual({
      llmProvider: 'openrouter',
      apiKey: null,
      socraticSystemPrompt: 'S',
      socraticWelcomeMsg: 'SW',
      socraticModel: 'm-soc',
    });
    expect(upsertArgs.update).not.toHaveProperty('lectureSystemPrompt');
  });

  it('resetConfig：只清空该模式覆盖（LECTURE）', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r1',
      aiTestReleaseId: null,
      aiTutorOnline: false,
    });
    mockPrisma.courseAiConfig.upsert.mockResolvedValue({
      lectureSystemPrompt: null,
      lectureWelcomeMsg: null,
      lectureModel: null,
      socraticSystemPrompt: 'keep',
      socraticWelcomeMsg: 'keep',
      socraticModel: 'm-soc',
      llmProvider: 'openrouter',
      apiKey: null,
    });
    mockPrisma.release.findUnique.mockResolvedValue({ versionTag: 'v1' });
    const view = await service.resetConfig('c1', 'LECTURE');
    const upsertArgs = mockPrisma.courseAiConfig.upsert.mock.calls[0][0];
    expect(upsertArgs.update).toEqual({
      lectureSystemPrompt: null,
      lectureWelcomeMsg: null,
      lectureModel: null,
      lectureModeId: null,
    });
    expect(upsertArgs.update).not.toHaveProperty('socraticSystemPrompt');
    expect(view.lecture.model).toBe('deepseek/deepseek-v4.1-flash');
    expect(view.socratic.model).toBe('m-soc');
  });

  it('resolvePrompts：按模式取对应自定义覆盖（优先于模板）', async () => {
    mockPrisma.courseAiConfig.findUnique.mockResolvedValue({
      lectureSystemPrompt: 'cust-L',
      lectureWelcomeMsg: 'wel-L',
      socraticSystemPrompt: null,
      socraticWelcomeMsg: null,
    });
    mockPrisma.promptTemplate.findFirst.mockResolvedValue({
      mode: 'SOCRATIC',
      systemPrompt: 'tpl-S',
      welcomeMsg: 'tpl-SW',
    });
    const lecture = await service.resolvePrompts('c1', 'r1', 'LECTURE');
    expect(lecture).toEqual({ systemPrompt: 'cust-L', welcomeMsg: 'wel-L' });
    const socratic = await service.resolvePrompts('c1', 'r1', 'SOCRATIC');
    expect(socratic).toEqual({ systemPrompt: 'tpl-S', welcomeMsg: 'tpl-SW' });
  });

  it('resolveRuntime：按模式取模型（缺省回退默认）', async () => {
    mockPrisma.courseAiConfig.findUnique.mockResolvedValue({
      llmProvider: 'openrouter',
      apiKey: null,
      lectureModel: 'm-lect',
      socraticModel: null,
    });
    const lecture = await service.resolveRuntime('c1', 'r1', 'LECTURE');
    expect(lecture.model).toBe('m-lect');
    const socratic = await service.resolveRuntime('c1', 'r1', 'SOCRATIC');
    expect(socratic.model).toBe('deepseek/deepseek-v4.1-flash');
  });

  it('listOnlineTutorsForUser：预留钩子应抛 NotImplementedException（501）', async () => {
    await expect(service.listOnlineTutorsForUser()).rejects.toThrow(
      NotImplementedException,
    );
  });
});
