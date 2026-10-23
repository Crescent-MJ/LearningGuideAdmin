import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Portal 课时（本期只消费标题；pages 为后续内容同步预留） */
export interface PortalLesson {
  externalId: string;
  title: string;
  pages?: unknown[];
}

/** Portal 章节（标题同步不区分章节，按 lessons 扁平处理） */
export interface PortalSection {
  externalId: string;
  title: string;
  lessons: PortalLesson[];
}

/** Portal 已发布课程（externalId = Portal course.slug） */
export interface PortalCourse {
  externalId: string;
  title: string;
  description?: string;
  sections?: PortalSection[];
  /** 扁平课时列表；由 top-level lessons 或 sections[].lessons 归一化得到 */
  lessons: PortalLesson[];
}

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * LearningGuidePortal 课程目录数据源（2026-10-22）。
 *
 * 只读取课程标题与课时标题：Portal 是课程主数据，KS 只维护知识库与 AI 配置。
 * 服务间鉴权使用 X-API-Key（PORTAL_API_TOKEN），令牌缺失时拒绝同步而不是裸奔。
 * e2e 通过 overrideProvider(PortalSourceService) 注入假数据源。
 */
@Injectable()
export class PortalSourceService {
  constructor(private readonly config: ConfigService) {}

  async listCourses(): Promise<PortalCourse[]> {
    const baseUrl = this.config.get<string>('PORTAL_API_BASE_URL')?.trim();
    const token = this.config.get<string>('PORTAL_API_TOKEN')?.trim();
    if (!baseUrl || !token) {
      throw new ServiceUnavailableException(
        '未配置 PORTAL_API_BASE_URL 或 PORTAL_API_TOKEN，无法同步 Portal 课程目录',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/integration/catalogue`, {
        headers: { 'X-API-Key': token },
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        `无法连接 Portal 课程目录：${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status >= 300 && response.status < 400) {
        throw new ServiceUnavailableException(
          `Portal 课程目录发生重定向（HTTP ${response.status}），请检查 PORTAL_API_BASE_URL 与 Portal 中间件配置`,
        );
      }
      throw new ServiceUnavailableException(
        `Portal 课程目录返回 HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as { courses?: unknown };
    if (!Array.isArray(payload.courses)) {
      throw new ServiceUnavailableException('Portal 课程目录格式不正确');
    }

    return payload.courses.map((raw) => this.parseCourse(raw));
  }

  async getCourse(externalId: string): Promise<PortalCourse | null> {
    const courses = await this.listCourses();
    return courses.find((course) => course.externalId === externalId) ?? null;
  }

  private parseCourse(raw: unknown): PortalCourse {
    const item = raw as Partial<PortalCourse>;
    if (typeof item.externalId !== 'string' || typeof item.title !== 'string') {
      throw new ServiceUnavailableException('Portal 课程目录格式不正确');
    }
    const sections = Array.isArray(item.sections) ? item.sections : [];
    const lessons = (
      Array.isArray(item.lessons) && item.lessons.length
        ? item.lessons
        : sections.flatMap((section) => section.lessons ?? [])
    )
      .filter(
        (lesson): lesson is PortalLesson =>
          typeof lesson?.externalId === 'string' &&
          typeof lesson?.title === 'string',
      )
      .map((lesson) => ({ externalId: lesson.externalId, title: lesson.title }));
    return {
      externalId: item.externalId,
      title: item.title,
      ...(typeof item.description === 'string'
        ? { description: item.description }
        : {}),
      lessons,
    };
  }
}
