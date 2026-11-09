// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Shiki theme tuned to the site palette: near-black background, green
// accents, greys for everything else. Keeps code blocks on-brand with the
// rest of the page instead of importing a random third-party theme.
const rxDark = {
  name: 'rx-dark',
  type: 'dark',
  colors: {
    'editor.background': '#111111',
    'editor.foreground': '#f4f1ea',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6b6b66', fontStyle: 'italic' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: '#d8d4cb' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'constant.other'], settings: { foreground: '#f4f1ea' } },
    { scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.operator.new', 'keyword.control'], settings: { foreground: '#b9b5ac' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#f4f1ea' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.class', 'support.type'], settings: { foreground: '#9a968d' } },
    { scope: ['variable', 'variable.other', 'meta.object-literal.key'], settings: { foreground: '#e2ded4' } },
    { scope: ['entity.name.tag', 'punctuation.definition.tag'], settings: { foreground: '#f4f1ea' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#7a7a75' } },
    { scope: ['invalid'], settings: { foreground: '#ff5f5f' } },
  ],
};

// https://astro.build/config
export default defineConfig({
  site: 'https://rxwsxn.com',
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/links') && !page.includes('/studio') })],
  markdown: {
    shikiConfig: {
      theme: rxDark,
      wrap: false,
    },
  },
});
