import type { CmsMediaView } from './media';

// CMS block types from Strapi
export interface SafeBlock {
  type: string;
  children?: SafeBlock[];
  text?: string;
  level?: number;
  format?: string;
  url?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface SupportArticleViewModel {
  documentId: string;
  locale: string;
  title: string;
  slug: string;
  excerpt: string;
  content: SafeBlock[];
  category: 'blog' | 'support' | 'insight';
  tags: string[];
  author: string;
  authorRole: string;
  displayDate: string | null;
  readTimeMinutes: number | null;
  cardImage: CmsMediaView | null;
  cardImageAlt: string;
  authorImage: CmsMediaView | null;
  authorImageAlt: string;
  seo: SupportArticleSeo;
}

export interface SupportArticleSeo {
  title: string;
  description: string;
}

export interface SupportPageViewModel {
  title: string;
  subtitle: string;
  insightsTitle: string;
  insightsSubtitle: string;
  recentCtaLabel: string;
  emptyArticlesText: string;
  emptyInsightsText: string;
  relatedTitle: string;
  feedbackTitle: string;
  feedbackYesLabel: string;
  feedbackNoLabel: string;
  seo: SupportPageSeo;
}

export interface SupportPageSeo {
  title: string;
  description: string;
}
