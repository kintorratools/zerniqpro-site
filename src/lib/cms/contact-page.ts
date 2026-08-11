import { strapiFetch } from './client';
import { getCmsConfig } from './config';
import { buildContactPageQuery } from './contact-page-queries';
import { CmsContentNotFoundError } from './errors';

export interface ContactPageViewModel {
  title: string;
  subtitle: string;
  formTitle: string;
  formSubtitle: string;
  firstNameLabel: string;
  lastNameLabel: string;
  detailsLabel: string;
  submitLabel: string;
  demoMessage: string;
  knowledgeHeading: string;
  knowledgeContent: string;
  knowledgeLinkLabel: string;
  knowledgeLinkUrl: string;
  faqHeading: string;
  faqContent: string;
  faqLinkLabel: string;
  faqLinkUrl: string;
  officeHeading: string;
  officeName: string;
  officeAddress: string;
  emailHeading: string;
  emailContent: string;
  contactEmail: string;
  seo: { title?: string; description?: string } | null;
}

/** Parse SEO from the Strapi response. */
function parseSeo(
  raw: unknown
): { title?: string; description?: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title : undefined;
  const description =
    typeof obj.description === 'string' ? obj.description : undefined;
  if (!title && !description) return null;
  return { title, description };
}

/**
 * Fetch the Contact Page content from Strapi for the given locale.
 * Throws CmsContentNotFoundError if no contact page is configured.
 */
export async function getContactPage(
  locale: string
): Promise<ContactPageViewModel> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new Error('CMS not configured');
  }

  const path = buildContactPageQuery(config.siteKey, locale);

  const raw: unknown = await strapiFetch(path);

  // Guard: must be an object with a non-empty data array
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data) ||
    ((raw as Record<string, unknown>).data as unknown[]).length === 0
  ) {
    throw new CmsContentNotFoundError();
  }

  const dataArr = (raw as Record<string, unknown>).data as unknown[];
  const entry = dataArr[0] as Record<string, unknown>;
  const attrs = (entry.attributes ?? entry) as Record<string, unknown>;

  return {
    title: typeof attrs.title === 'string' ? attrs.title : '',
    subtitle: typeof attrs.subtitle === 'string' ? attrs.subtitle : '',
    formTitle: typeof attrs.formTitle === 'string' ? attrs.formTitle : '',
    formSubtitle:
      typeof attrs.formSubtitle === 'string' ? attrs.formSubtitle : '',
    firstNameLabel:
      typeof attrs.firstNameLabel === 'string' ? attrs.firstNameLabel : '',
    lastNameLabel:
      typeof attrs.lastNameLabel === 'string' ? attrs.lastNameLabel : '',
    detailsLabel:
      typeof attrs.detailsLabel === 'string' ? attrs.detailsLabel : '',
    submitLabel: typeof attrs.submitLabel === 'string' ? attrs.submitLabel : '',
    demoMessage: typeof attrs.demoMessage === 'string' ? attrs.demoMessage : '',
    knowledgeHeading:
      typeof attrs.knowledgeHeading === 'string' ? attrs.knowledgeHeading : '',
    knowledgeContent:
      typeof attrs.knowledgeContent === 'string' ? attrs.knowledgeContent : '',
    knowledgeLinkLabel:
      typeof attrs.knowledgeLinkLabel === 'string'
        ? attrs.knowledgeLinkLabel
        : '',
    knowledgeLinkUrl:
      typeof attrs.knowledgeLinkUrl === 'string' ? attrs.knowledgeLinkUrl : '',
    faqHeading: typeof attrs.faqHeading === 'string' ? attrs.faqHeading : '',
    faqContent: typeof attrs.faqContent === 'string' ? attrs.faqContent : '',
    faqLinkLabel:
      typeof attrs.faqLinkLabel === 'string' ? attrs.faqLinkLabel : '',
    faqLinkUrl: typeof attrs.faqLinkUrl === 'string' ? attrs.faqLinkUrl : '',
    officeHeading:
      typeof attrs.officeHeading === 'string' ? attrs.officeHeading : '',
    officeName: typeof attrs.officeName === 'string' ? attrs.officeName : '',
    officeAddress:
      typeof attrs.officeAddress === 'string' ? attrs.officeAddress : '',
    emailHeading:
      typeof attrs.emailHeading === 'string' ? attrs.emailHeading : '',
    emailContent:
      typeof attrs.emailContent === 'string' ? attrs.emailContent : '',
    contactEmail:
      typeof attrs.contactEmail === 'string' ? attrs.contactEmail : '',
    seo: parseSeo(attrs.seo),
  };
}
