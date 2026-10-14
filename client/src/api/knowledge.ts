import { http } from './client'

// ============ 类型（与后端 Prisma 模型字段对齐，§2） ============

export type SyncState = 'SYNCED' | 'STALE'

export interface PageNode {
  id: string
  title: string
  contentMd: string
  tags: string[] | null
  sortOrder: number
  syncState: SyncState
}

export interface LessonNode {
  id: string
  title: string
  duration: number | null
  sortOrder: number
  syncState: SyncState
  pages: PageNode[]
}

export interface Course {
  id: string
  title: string
  description: string | null
  externalId: string | null
  createdAt: string
  updatedAt: string
}

export interface CourseDetail extends Course {
  lessons: LessonNode[]
}

export interface ReleaseSummary {
  id: string
  versionTag: string
  revisionNotes: string
  createdAt: string
}

export interface ReleaseDetail extends ReleaseSummary {
  courseId: string
  snapshotData: {
    lessons: Array<{
      id: string
      title: string
      pages: Array<{
        id: string
        title: string
        contentMd: string
        tags: string[] | null
      }>
    }>
  }
}

// 外部源同步（§3.2.2 / §5.1.5）
export interface ExternalCourseStatus {
  externalId: string
  title: string
  localCourseId: string | null
  status: 'not_synced' | 'synced' | 'has_updates'
}

export interface SyncSummary {
  created: number
  staleMarked: number
  unchanged: boolean
}

// ============ 接口封装（§5.1 知识库相关 18 端点） ============

export const knowledgeApi = {
  // 课程 CRUD（§5.1.1）
  listCourses: () =>
    http.get<Course[]>('/courses').then((r) => r.data),
  getCourse: (id: string) =>
    http.get<CourseDetail>(`/courses/${id}`).then((r) => r.data),
  updateCourse: (id: string, data: Partial<Course>) =>
    http.put<Course>(`/courses/${id}`, data).then((r) => r.data),
  deleteCourse: (id: string) =>
    http.delete(`/courses/${id}`).then((r) => r.data),

  // 章节 CRUD（§5.1.2）
  createLesson: (courseId: string, data: { title: string; duration?: number }) =>
    http.post<LessonNode>(`/courses/${courseId}/lessons`, data).then((r) => r.data),
  updateLesson: (id: string, data: { title?: string; duration?: number }) =>
    http.put<LessonNode>(`/lessons/${id}`, data).then((r) => r.data),
  deleteLesson: (id: string) =>
    http.delete(`/lessons/${id}`).then((r) => r.data),
  reorderLesson: (id: string, sortOrder: number) =>
    http.put<LessonNode>(`/lessons/${id}/reorder`, { sortOrder }).then((r) => r.data),

  // 页面 CRUD（§5.1.3）
  createPage: (
    lessonId: string,
    data: { title: string; contentMd: string; tags?: string[] },
  ) => http.post<PageNode>(`/lessons/${lessonId}/pages`, data).then((r) => r.data),
  getPage: (id: string) =>
    http.get<PageNode>(`/pages/${id}`).then((r) => r.data),
  updatePage: (
    id: string,
    data: { title?: string; contentMd?: string; tags?: string[]; sortOrder?: number },
  ) => http.put<PageNode>(`/pages/${id}`, data).then((r) => r.data),
  deletePage: (id: string) =>
    http.delete(`/pages/${id}`).then((r) => r.data),

  // 发布与版本（§5.1.4）
  publish: (courseId: string, revisionNotes: string) =>
    http.post<ReleaseDetail>(`/courses/${courseId}/release`, { revisionNotes }).then((r) => r.data),
  listReleases: (courseId: string) =>
    http.get<ReleaseSummary[]>(`/courses/${courseId}/releases`).then((r) => r.data),
  getRelease: (releaseId: string) =>
    http.get<ReleaseDetail>(`/releases/${releaseId}`).then((r) => r.data),

  // 同步（§5.1.5 / §3.2.2 外部源接管模型）
  listExternalCourses: () =>
    http.get<ExternalCourseStatus[]>('/sync/external-courses').then((r) => r.data),
  syncStructure: (externalId: string) =>
    http.post<SyncSummary>('/sync/structure', { externalId }).then((r) => r.data),
  syncAll: (externalId: string) =>
    http.post<SyncSummary>('/sync/all', { externalId }).then((r) => r.data),
}
