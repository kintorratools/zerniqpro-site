export interface NavigationItemRecord {
  id?: number;
  label: string;
  href: string;
  children?: NavigationItemRecord[] | null;
  order?: number | null;
  visible?: boolean | null;
}

export interface NavigationRecord {
  id: number;
  documentId: string;
  site?: { key?: string } | null;
  locale?: string | null;
  items: NavigationItemRecord[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

export interface NavigationViewModel {
  items: NavigationItem[];
}
