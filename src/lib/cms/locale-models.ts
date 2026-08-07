export interface LocaleRecord {
  id: number;
  documentId: string;
  code: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  direction?: 'ltr' | 'rtl' | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface LocaleViewModel {
  code: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  direction: 'ltr' | 'rtl';
}
