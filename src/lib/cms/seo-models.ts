export interface SEOConfig {
  title: string;
  description: string;
  ogImage?: { url?: string; alt?: string };
  twitterImage?: { url?: string; alt?: string };
  canonical?: string;
}
