/**
 * word-extractor 官方无类型声明，此处按本项目实际用到的 API 做最小声明（2026-10-19 新增）。
 * 仅覆盖：Buffer 输入 + 正文纯文本提取（旧版 .doc 转换用）。
 */
declare module 'word-extractor' {
  interface WordDocument {
    /** 文档正文纯文本（保留 Unicode，无格式/表格/图片） */
    getBody(): string;
  }

  class WordExtractor {
    /** filename 或 Buffer；本项目仅传 Buffer（内存直转，不落盘） */
    extract(source: string | Buffer): Promise<WordDocument>;
  }

  export = WordExtractor;
}
