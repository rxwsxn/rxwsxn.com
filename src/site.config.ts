/**
 * Single source of truth for site-wide identity and the home page.
 * Edit this file to change the wordmark, tagline, hero, links, SEO defaults, etc.
 */
export const SITE = {
  url: 'https://rxwsxn.com',
  name: 'Raushan Kumar',
  wordmark: 'raushan kumar',
  tagline: 'ai product engineer',
  jobTitle: 'AI + Product Engineer',
  location: 'bangalore / remote',
  email: 'raushan@rxwsxn.com',
  github: 'https://github.com/rxwsxn',
  description:
    'Raushan Kumar — AI + product engineer based in Bangalore / remote. I take models out of notebooks and turn them into products people actually use.',

  // ---- home hero ----------------------------------------------------------
  greeting: "hey — i'm raushan kumar",
  /** Words the hero statement cycles through. */
  heroWords: ['ai products', 'agents', 'evals', 'llm tooling'],
  heroSub:
    'AI + product engineer in Bangalore / remote. I take models out of notebooks and turn them into things people actually use.',

  /** The currently / previously strip under the hero. */
  now: [
    { k: 'currently', v: 'building dostlabs — an ai + saas product studio' },
    { k: 'previously', v: 'software engineer (ai) at deep cognition' },
    { k: 'based in', v: 'bangalore / remote' },
  ],

  /** File-labelled asides (the .txt blocks). */
  asides: [
    { file: 'exploring.txt', text: 'eval design, retrieval, and how llm features earn their keep.' },
    { file: 'after-hours.txt', text: 'long runs, filter coffee, and a shelf of unfinished side projects.' },
  ],

  // ---- seo ----------------------------------------------------------------
  /** Locale for og:locale and JSON-LD. */
  locale: 'en_IN',
  /** Set when you have one, e.g. '@rxwsxn'. Drives twitter:site and twitter:creator. */
  twitter: '@rxwsxn',

  footerNote: 'static html · hand-written css',

  /** Contact page links. 'github' and 'email' are rendered explicitly; the rest
   *  are appended below them. */
  links: [
    { label: 'github', href: 'https://github.com/rxwsxn' },
    { label: 'email', href: 'mailto:raushan@rxwsxn.com' },
    { label: 'x', href: 'https://x.com/rxwsxn' },
    { label: 'linkedin', href: 'https://www.linkedin.com/in/rxwsxn' },
    { label: 'youtube', href: 'https://www.youtube.com/@rxwsxn' },
    { label: 'instagram', href: 'https://www.instagram.com/rxwsxn' },
    { label: 'peerlist', href: 'https://peerlist.io/raushan' },
  ],
};

export type SiteLink = { label: string; href: string };
