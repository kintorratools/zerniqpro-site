import type { CmsMedia } from './media';

export interface ProductViewModel {
  /** Product documentId from Strapi */
  documentId: string;
  /** URL-friendly unique identifier (non-localized) */
  handle: string;
  /** Product name (localized) */
  name: string;
  /** Short product summary (localized) */
  summary: string;
  /** Sort order (non-localized) */
  displayOrder: number;
  /** Product intro text (localized) */
  introText: string;
  /** Card/listing image (non-localized, shared across locales) */
  cardImage: CmsMedia | null;
  /** Main detail image (non-localized, shared across locales) */
  mainImage: CmsMedia | null;
  /** Main image alt text (localized) */
  mainImageAlt: string;
  /** Description tab label (localized) */
  descriptionTabLabel: string;
  /** Specifications tab label (localized) */
  specificationsTabLabel: string;
  /** Blueprints tab label (localized) */
  blueprintsTabLabel: string;
  /** Long description title (localized) */
  longDescriptionTitle: string;
  /** Long description subtitle (localized) */
  longDescriptionSubtitle: string;
  /** Call-to-action button label (localized) */
  ctaLabel: string;
  /** Call-to-action link URL (localized) */
  ctaUrl: string;
  /** Key features list (localized) */
  descriptionItems: Array<{ title: string; description: string }>;
  /** Left column specifications (localized) */
  specificationsLeft: Array<{ title: string; description: string }>;
  /** Right column specifications (localized) */
  specificationsRight: Array<{ title: string; description: string }>;
  /** Tabular data (localized) */
  tableData: Array<{ feature: string[]; description: string[][] }> | null;
  /** First blueprint image (non-localized, shared across locales) */
  blueprintFirst: CmsMedia | null;
  /** First blueprint alt text (localized) */
  blueprintFirstAlt: string;
  /** Second blueprint image (non-localized, shared across locales) */
  blueprintSecond: CmsMedia | null;
  /** Second blueprint alt text (localized) */
  blueprintSecondAlt: string;
  /** SEO metadata (localized) */
  seo: {
    title: string;
    description: string;
  };
}

/** Product Page content model (for the /products/ listing page) */
export interface ProductPageViewModel {
  documentId: string;
  title: string;
  subtitle: string;
  customerStoriesLabel: string;
  whyChooseTitle: string;
  whyChooseSubtitle: string;
  benefit1: string;
  benefit2: string;
  benefit3: string;
  testimonialsTitle: string;
  testimonials: Array<{
    content: string;
    author: string;
    role: string;
    avatar: CmsMedia | null;
  }>;
  seo: {
    title: string;
    description: string;
  };
}
