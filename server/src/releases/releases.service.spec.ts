import { NotFoundException } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ReleasesService 单元测试（2026-10-16 扁平化：lessons → pages）。
 * 快照结构、versionTag 格式、发布即激活、切换激活版本（重建 Page 草稿）与 isActive 标注。
 */
describe('ReleasesService', () => {
  const mockTx = {
    course: { findUnique: jest.fn(), update: jest.fn() },
    release: { create: jest.fn() },
    page: { deleteMany: jest.fn(), create: jest.fn() },
  };
  const mockPrisma = {
    course: { findUnique: jest.fn() },
    release: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx),
    ),
  };

  let service: ReleasesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReleasesService(mockPrisma as unknown as PrismaService);
  });

  it('publish：快照应含 pages 内容，versionTag 匹配 CourseName_YYYYMMDDHHmm，且发布即激活（§3.4.3）', async () => {
    mockTx.course.findUnique.mockResolvedValue({
      id: 'c1',
      title: '数学基础',
      pages: [
        { id: 'p1', title: '第一章', contentMd: '# hi', sectionTags: null },
      ],
    });
    mockTx.release.create.mockImplementation(({ data }: { data: unknown }) =>
      Promise.resolve({ id: 'r1', ...(data as object) }),
    );

    const result = (await service.publish('c1', {
      revisionNotes: '首发',
    })) as { versionTag: string; snapshotData: unknown; revisionNotes: string };

    expect(result.versionTag).toMatch(/^数学基础_\d{12}$/);
    expect(result.snapshotData).toEqual({
      pages: [
        { id: 'p1', title: '第一章', contentMd: '# hi', sectionTags: null },
      ],
    });
    expect(result.revisionNotes).toBe('首发');
    expect(mockTx.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { currentReleaseId: 'r1' },
    });
    // 快照仅收录 SYNCED 节点：事务内查询条件应带 syncState 过滤
    const courseQuery = mockTx.course.findUnique.mock
      .calls[0][0] as Record<string, never>;
    expect(JSON.stringify(courseQuery)).toContain('SYNCED');
  });

  it('publish：课程不存在时 404', async () => {
    mockTx.course.findUnique.mockResolvedValue(null);
    await expect(
      service.publish('missing', { revisionNotes: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('findAllByCourse：列表不含 snapshotData，且按 currentReleaseId 标注 isActive', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      currentReleaseId: 'r1',
    });
    mockPrisma.release.findMany.mockResolvedValue([
      { id: 'r1', versionTag: 'v1', revisionNotes: 'a', createdAt: 't1' },
      { id: 'r2', versionTag: 'v2', revisionNotes: 'b', createdAt: 't2' },
    ]);
    const list = await service.findAllByCourse('c1');
    expect(list.map((r) => r.isActive)).toEqual([true, false]);
    const select = mockPrisma.release.findMany.mock.calls[0][0] as {
      select: { snapshotData?: unknown };
    };
    expect(select.select.snapshotData).toBeUndefined();
  });

  it('activate：事务内重建 Page 草稿并更新 currentReleaseId', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
    mockPrisma.release.findUnique.mockResolvedValue({
      id: 'r2',
      courseId: 'c1',
      versionTag: '数学基础_202610150000',
      snapshotData: {
        pages: [
          { id: 'p1', title: '第一章', contentMd: '# old', sectionTags: null },
          { id: 'p2', title: '第二章', contentMd: '# keep', sectionTags: { 'h1-sec': ['tag'] } },
        ],
      },
    });

    const result = await service.activate('c1', { releaseId: 'r2' });

    expect(result).toEqual({
      id: 'r2',
      versionTag: '数学基础_202610150000',
    });
    // 删除当前所有 Page
    expect(mockTx.page.deleteMany).toHaveBeenCalledWith({
      where: { courseId: 'c1' },
    });
    // 快照节点重建：2 pages，sortOrder 按快照顺序
    expect(mockTx.page.create).toHaveBeenCalledTimes(2);
    expect(mockTx.page.create.mock.calls[1][0].data).toMatchObject({
      title: '第二章',
      contentMd: '# keep',
      sortOrder: 1,
    });
    expect(mockTx.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { currentReleaseId: 'r2' },
    });
  });

  it('activate：releaseId 不属于该课程时 404，且不触碰事务', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
    mockPrisma.release.findUnique.mockResolvedValue({
      id: 'r9',
      courseId: 'other',
    });
    await expect(
      service.activate('c1', { releaseId: 'r9' }),
    ).rejects.toThrow(NotFoundException);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
