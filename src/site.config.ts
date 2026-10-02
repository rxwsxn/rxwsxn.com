/**
 * Single source of truth for site-wide identity.
 * Edit this file to change the wordmark, tagline, links, etc.
 */
export const SITE = {
  url: 'https://rxwsxn.com',
  name: 'Raushan Kumar',
  wordmark: 'rxwsxn',
  tagline: 'ai + product',
  location: 'bangalore / remote',
  email: 'raushan@rxwsxn.com',
  github: 'https://github.com/rxwsxn',
  description:
    'Raushan Kumar — AI + product engineer based in Bangalore / remote. Notes on building, shipping, and the occasional blog post.',
  /** Toggle the hero portrait once you drop an image at src/assets/portrait.jpg */
  showPhoto: false,
  /** Shown in the footer. */
  footerNote: 'static html · hand-written css',
  /** Contact + footer links. Add linkedin / x / resume here when you have them. */
  links: [
    { label: 'github', href: 'https://github.com/rxwsxn' },
    { label: 'email', href: 'mailto:raushan@rxwsxn.com' },
  ],
} as const;

export type SiteLink = { label: string; href: string };
