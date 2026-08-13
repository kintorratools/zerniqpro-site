/**
 * CMS-driven blog/insight article fetcher.
 * Fetches articles from Strapi support-articles by category and locale.
 * Falls back gracefully if CMS is not configured.
 */
import { strapiFetch } from './client';
import {
  buildSupportArticlesByCategoryQuery,
  buildSupportArticleBySlugQuery,
} from './support-queries';
import { parseSupportArticlesResponse } from './support-schemas';
import type { SupportArticleViewModel, SafeBlock } from './support-models';
import { getCmsConfig } from './config';

/** Fetch CMS blog articles by locale */
export async function getCmsBlogArticles(
  locale: string
): Promise<SupportArticleViewModel[]> {
  const config = getCmsConfig();
  if (!config.configured) return [];

  try {
    const path = buildSupportArticlesByCategoryQuery(
      config.siteKey!,
      locale,
      'blog'
    );
    const raw = await strapiFetch<unknown>(path);
    return parseSupportArticlesResponse(raw);
  } catch {
    return [];
  }
}

/** Fetch CMS insight articles by locale */
export async function getCmsInsightArticles(
  locale: string
): Promise<SupportArticleViewModel[]> {
  const config = getCmsConfig();
  if (!config.configured) return [];

  try {
    const path = buildSupportArticlesByCategoryQuery(
      config.siteKey!,
      locale,
      'insight'
    );
    const raw = await strapiFetch<unknown>(path);
    return parseSupportArticlesResponse(raw);
  } catch {
    return [];
  }
}

/** Fetch a single CMS article by slug and locale */
export async function getCmsArticleBySlug(
  slug: string,
  locale: string
): Promise<SupportArticleViewModel | null> {
  const config = getCmsConfig();
  if (!config.configured) return null;

  try {
    const path = buildSupportArticleBySlugQuery(config.siteKey!, locale, slug);
    const raw = await strapiFetch<unknown>(path);
    const articles = parseSupportArticlesResponse(raw);
    return articles[0] || null;
  } catch {
    return null;
  }
}

/**
 * Convert Strapi rich-text blocks to an HTML string.
 * Supports: paragraph, heading, list (unordered/ordered), list-item, text (with bold/italic).
 */
export function renderBlocksToHtml(blocks: SafeBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  return blocks
    .map(block => renderBlock(block))
    .filter(Boolean)
    .join('\n');
}

function renderBlock(block: SafeBlock): string {
  switch (block.type) {
    case 'paragraph':
      return `<p>${renderChildren(block.children)}</p>`;

    case 'heading': {
      const level = Math.min(Math.max(block.level || 2, 1), 6);
      return `<h${level}>${renderChildren(block.children)}</h${level}>`;
    }

    case 'list': {
      const tag = block.format === 'ordered' ? 'ol' : 'ul';
      const items = (block.children || [])
        .map(item => renderBlock(item))
        .filter(Boolean)
        .join('');
      return `<${tag}>${items}</${tag}>`;
    }

    case 'list-item':
      return `<li>${renderChildren(block.children)}</li>`;

    case 'text': {
      let text = escapeHtml(block.text || '');
      if (block.bold) text = `<strong>${text}</strong>`;
      if (block.italic) text = `<em>${text}</em>`;
      return text;
    }

    default:
      // Fallback: render as paragraph if it has children/text
      if (block.children?.length) {
        return `<p>${renderChildren(block.children)}</p>`;
      }
      if (block.text) {
        return `<p>${escapeHtml(block.text)}</p>`;
      }
      return '';
  }
}

function renderChildren(children?: SafeBlock[]): string {
  if (!children || children.length === 0) return '';
  return children.map(child => renderBlock(child)).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
