import { z } from 'astro/zod';
import type {
  NavigationRecord,
  NavigationItemRecord,
  NavigationViewModel,
  NavigationItem,
} from './navigation-models';
import { CmsValidationError } from './errors';

/** Validate a single navigation item (recursive via z.lazy) */
const navigationItemRecordSchema: z.ZodType<NavigationItemRecord> = z.lazy(() =>
  z.object({
    id: z.number().optional(),
    label: z.string().trim().min(1),
    href: z.string(),
    children: z.array(navigationItemRecordSchema).nullable().optional(),
    order: z.number().nullable().optional(),
    visible: z.boolean().nullable().optional(),
  })
);

/** Raw Strapi 5 flat entity shape */
const navigationRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  site: z
    .object({
      key: z.string().optional(),
    })
    .nullable()
    .optional(),
  locale: z
    .object({
      code: z.string().optional(),
    })
    .nullable()
    .optional(),
  items: z.array(navigationItemRecordSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: NavigationRecord[] } */
const strapiCollectionNavigationSchema = z.object({
  data: z.array(navigationRecordSchema),
});

/** Map a single NavigationItemRecord → NavigationItem, recursing into children */
function toNavigationItem(record: NavigationItemRecord): NavigationItem {
  const children = (record.children ?? [])
    .filter(c => c != null)
    .filter(c => c.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(c => toNavigationItem(c));

  return {
    label: record.label,
    href: record.href,
    ...(children.length > 0 ? { children } : {}),
  };
}

/** Map a validated NavigationRecord to NavigationViewModel */
function toNavigationViewModel(record: NavigationRecord): NavigationViewModel {
  const items = record.items
    .filter(item => item.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(item => toNavigationItem(item));

  return { items };
}

/** Parse and validate a Strapi collection response, returning the first match */
export function parseNavigationResponse(raw: unknown): NavigationViewModel {
  const result = strapiCollectionNavigationSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsValidationError();
  }

  return toNavigationViewModel(match);
}
