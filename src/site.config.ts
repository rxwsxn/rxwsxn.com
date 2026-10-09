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
    { k: 'currently', v: 'building ai products and writing the messy parts down' },
    { k: 'previously', v: 'add your last role here' },
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
  twitter: '',

  footerNote: 'static html · hand-written css',

  /** Contact + footer links. Add linkedin / x / resume here when you have them. */
  links: [
    { label: 'github', href: 'https://github.com/rxwsxn' },
    { label: 'email', href: 'mailto:raushan@rxwsxn.com' },
  ],
};

export type SiteLink = { label: string; href: string };
