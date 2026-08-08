import type { CmsMedia, CmsMediaView } from './media';

// ── Sub-component types ──

export interface Partner {
  name: string;
  url: string;
  alt: string;
  logo?: CmsMedia | null;
}

export interface FeatureItem {
  heading: string;
  content: string;
  svg: string;
}

export interface FeatureTab {
  heading: string;
  content: string;
  iconKey: string;
  imageAlt: string;
  image?: CmsMedia | null;
}

export interface TestimonialItem {
  content: string;
  author: string;
  role: string;
  avatar?: CmsMedia | null;
}

export interface Statistic {
  count: string;
  description: string;
}

export interface PricingPlan {
  name: string;
  description: string;
  price: string;
  cents: string;
  billingFrequency: string;
  features: string[];
  purchaseBtnTitle: string;
  purchaseLink: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// ── Section types ──

export interface AnnouncementSection {
  enabled: boolean;
  buttonLabel: string;
  url: string;
}

export interface HeroSection {
  titleBefore: string;
  highlightText: string;
  titleAfter: string;
  subTitle: string;
  primaryButtonLabel: string;
  primaryButtonUrl: string;
  secondaryButtonLabel: string;
  secondaryButtonUrl: string;
  withReview: boolean;
  ratingText: string;
  starCount: number;
  reviewsText: string;
  imageAlt: string;
  image?: CmsMediaView | null;
  avatars: CmsMediaView[];
}

export interface ClientsSection {
  title: string;
  subTitle: string;
  partners: Partner[];
}

export interface FeaturesGeneralSection {
  title: string;
  subTitle: string;
  imageAlt: string;
  image?: CmsMediaView | null;
  items: FeatureItem[];
}

export interface FeaturesNavsSection {
  titleBefore: string;
  highlightText: string;
  titleAfter: string;
  tabs: FeatureTab[];
}

export interface TestimonialsSection {
  title: string;
  subTitle: string;
  items: TestimonialItem[];
  statistics: Statistic[];
}

export interface PricingSection {
  title: string;
  subTitle: string;
  badge: string;
  thirdOption: string;
  btnText: string;
  starterKit: PricingPlan;
  professionalToolbox: PricingPlan;
}

export interface FaqSection {
  titleLine1: string;
  titleLine2: string;
  items: FaqItem[];
}

export interface BottomCtaSection {
  title: string;
  subTitle: string;
  buttonLabel: string;
  url: string;
}

export interface HomepageSeo {
  title: string;
  description: string;
}

// ── ViewModel ──

export interface HomepageViewModel {
  announcement: AnnouncementSection;
  hero: HeroSection;
  clients: ClientsSection;
  featuresGeneral: FeaturesGeneralSection;
  featuresNavs: FeaturesNavsSection;
  testimonials: TestimonialsSection;
  pricing: PricingSection;
  faq: FaqSection;
  bottomCta: BottomCtaSection;
  seo: HomepageSeo;
}

// ── Strapi Raw Record Shape (for schema parsing) ──

export interface HomepageRecord {
  id: number;
  documentId: string;
  announcement?: AnnouncementSection | null;
  hero?: HeroSection | null;
  clients?: ClientsSection | null;
  featuresGeneral?: FeaturesGeneralSection | null;
  featuresNavs?: FeaturesNavsSection | null;
  testimonials?: TestimonialsSection | null;
  pricing?: PricingSection | null;
  faq?: FaqSection | null;
  bottomCta?: BottomCtaSection | null;
  seo?: HomepageSeo | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}
