import type { CmsMediaView } from './media';

export interface DownloadEntry {
  id: number;
  title: string;
  description: string;
  categoryKey: string;
  categoryLabel: string;
  version: string;
  platform: string;
  file: CmsMediaView | null;
  displayOrder: number;
}
