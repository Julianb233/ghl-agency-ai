/**
 * Document Parser Service
 *
 * Handles parsing of various document formats (PDF, DOCX, TXT, HTML)
 * for ingestion into the RAG system for agent training.
 */

// pdf-parse is loaded dynamically to avoid serverless compatibility issues
// (pdfjs-dist uses browser APIs like DOMMatrix that aren't available in Node.js serverless)
let pdfParse: any = null;

async function getPdfParser() {
  if (pdfParse) return pdfParse;

  try {
    // Dynamic import to avoid loading at startup
    const pdfParseModule = await import('pdf-parse') as any;
    pdfParse = pdfParseModule.default || pdfParseModule;
    return pdfParse;
  } catch (error) {
    console.error('[DocumentParser] Failed to load pdf-parse:', error);
    throw new Error('PDF parsing is not available in this environment');
  }
}

export interface ParsedDocument {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    charCount: number;
    title?: string;
    author?: string;
    creationDate?: string;
    format: string;
  };
}

export interface ParseOptions {
  maxPages?: number;
  extractImages?: boolean;
}

class DocumentParserService {
  /**
   * Parse a PDF buffer and extract text
   */
  async parsePdf(buffer: Buffer, options: ParseOptions = {}): Promise<ParsedDocument> {
    try {
      // Load pdf-parse dynamically
      const parser = await getPdfParser();
      const data = await parser(buffer, {
        max: options.maxPages || 0, // 0 means all pages
      });

      const text = data.text.trim();

      return {
        text,
        metadata: {
          pageCount: data.numpages,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          charCount: text.length,
          title: data.info?.Title || undefined,
          author: data.info?.Author || undefined,
          creationDate: data.info?.CreationDate || undefined,
          format: 'pdf',
        },
      };
    } catch (error) {
      console.error('[DocumentParser] PDF parse error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse plain text content
   */
  parseText(content: string): ParsedDocument {
    const text = content.trim();

    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        format: 'text',
      },
    };
  }

  /**
   * Parse HTML content and extract text
   */
  parseHtml(content: string): ParsedDocument {
    // Strip script and style tags
    let text = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Extract title if present
    const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Strip all remaining HTML tags
    text = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        title,
        format: 'html',
      },
    };
  }

  /**
   * Parse markdown content
   */
  parseMarkdown(content: string): ParsedDocument {
    // Extract title from first H1
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Convert markdown to plain text (basic conversion)
    let text = content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove headers but keep text
      .replace(/^#+\s+/gm, '')
      // Remove emphasis
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        title,
        format: 'markdown',
      },
    };
  }

  /**
   * Auto-detect format and parse document
   */
  async parse(
    content: Buffer | string,
    mimeType?: string,
    filename?: string
  ): Promise<ParsedDocument> {
    // Determine format from mime type or filename
    const format = this.detectFormat(mimeType, filename, content);

    switch (format) {
      case 'pdf':
        if (typeof content === 'string') {
          throw new Error('PDF content must be a Buffer');
        }
        return this.parsePdf(content);

      case 'html':
        if (Buffer.isBuffer(content)) {
          return this.parseHtml(content.toString('utf-8'));
        }
        return this.parseHtml(content);

      case 'markdown':
        if (Buffer.isBuffer(content)) {
          return this.parseMarkdown(content.toString('utf-8'));
        }
        return this.parseMarkdown(content);

      case 'text':
      default:
        if (Buffer.isBuffer(content)) {
          return this.parseText(content.toString('utf-8'));
        }
        return this.parseText(content);
    }
  }

  /**
   * Detect document format from mime type, filename, or content
   */
  private detectFormat(
    mimeType?: string,
    filename?: string,
    content?: Buffer | string
  ): 'pdf' | 'html' | 'markdown' | 'text' {
    // Check mime type
    if (mimeType) {
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType === 'text/html') return 'html';
      if (mimeType === 'text/markdown') return 'markdown';
      if (mimeType.startsWith('text/')) return 'text';
    }

    // Check filename extension
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'pdf') return 'pdf';
      if (ext === 'html' || ext === 'htm') return 'html';
      if (ext === 'md' || ext === 'markdown') return 'markdown';
      if (ext === 'txt') return 'text';
    }

    // Check content magic bytes for PDF
    if (Buffer.isBuffer(content)) {
      const header = content.slice(0, 5).toString();
      if (header === '%PDF-') return 'pdf';
    }

    // Check content for HTML
    if (typeof content === 'string' || Buffer.isBuffer(content)) {
      const str = Buffer.isBuffer(content) ? content.toString('utf-8', 0, 100) : content.slice(0, 100);
      if (str.trim().toLowerCase().startsWith('<!doctype html') || str.trim().toLowerCase().startsWith('<html')) {
        return 'html';
      }
    }

    return 'text';
  }
}

export const documentParserService = new DocumentParserService();
