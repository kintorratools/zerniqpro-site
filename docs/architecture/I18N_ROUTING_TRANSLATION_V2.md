# I18N Routing & Translation Governance V2

## Overview

- Phase 11 establishes the i18n routing and hreflang foundation
- EN is the source locale for all content
- Translation is deferred to future phases — no provider integration, no auto-translation, no fake translations in this phase

## Source Locale

- EN (English) is the single source locale
- All original content is authored in EN first
- Content updates start from EN → translation tasks derived from EN

## Translation Workflow (Future Phase)

1. EN content published or updated in CMS
2. System computes source hash of EN content (SHA-256 of serialized content fields)
3. For each enabled target locale with `autoTranslate: true`, system checks if a translation task exists with matching sourceHash
4. If no match: create/refresh translation draft task for that locale
5. Machine translation provider (DeepL/Google/AI) generates draft only — NEVER auto-publishes
6. Human reviewer reviews the draft translation in CMS
7. Human manually publishes the translation
8. `manualLock` flag prevents auto-overwrite of human-reviewed translations

## Translation Data Model (Future)

| Field             | Type             | Description                                                             |
| ----------------- | ---------------- | ----------------------------------------------------------------------- |
| `sourceHash`      | `string`         | SHA-256 of source content at time of translation request                |
| `sourceLocale`    | `string`         | Always 'en'                                                             |
| `targetLocale`    | `string`         | e.g., 'fr', 'es', 'de', 'pt-BR'                                         |
| `provider`        | `string`         | Translation provider name (e.g., 'deepl', 'google', 'openai')           |
| `status`          | `enum`           | 'pending' \| 'draft' \| 'reviewed' \| 'published' \| 'stale' \| 'error' |
| `manualLock`      | `boolean`        | If true, auto-translation won't overwrite this entry                    |
| `provenance`      | `string`         | 'machine' \| 'human' \| 'machine-reviewed'                              |
| `glossaryVersion` | `string`         | Version of the translation glossary used                                |
| `lastError`       | `string \| null` | Last error message if status is 'error'                                 |
| `createdAt`       | `datetime`       | Automatic timestamp                                                     |
| `updatedAt`       | `datetime`       | Automatic timestamp                                                     |

## Phase 11 Guards

- `TRANSLATION_PROVIDER_ACTIVE = NO` — no translation provider is connected
- `AUTO_TRANSLATION_WRITES = 0` — no automatic translation writes occur
- No DeepL API key, Google Cloud key, or AI provider key is configured
- No fake translations are created as seed data or test fixtures
- The document itself is the contract; implementation is deferred

## Supported Locales

| Code    | Status                                                                       |
| ------- | ---------------------------------------------------------------------------- |
| `en`    | Source locale, enabled, default                                              |
| `fr`    | Enabled, has published content (FR translations exist in CMS)                |
| `es`    | Enabled in Locale Config, but ZERO published content (no translations exist) |
| `de`    | Disabled in Locale Config, zero content                                      |
| `pt-BR` | Disabled in Locale Config, zero content                                      |

## Locale Availability Rules

- A locale appears in hreflang alternates only if ALL three conditions are met:
  1. `enabled: true` in Locale Config
  2. Route template is supported for that locale (logical route mapping exists)
  3. Content is published for that locale in the relevant CMS Collection Type
- No cross-locale content fallback (FR page never shows EN content)
- x-default hreflang points to EN version, only when EN content exists for that route
