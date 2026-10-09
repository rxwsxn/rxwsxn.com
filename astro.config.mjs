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
    'editor.background': '#0a0a0a',
    'editor.foreground': '#e6e6e6',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6a6a6a', fontStyle: 'italic' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: '#00ff88' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'constant.other'], settings: { foreground: '#00ff88' } },
    { scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.operator.new', 'keyword.control'], settings: { foreground: '#7fe9b0' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#e6e6e6' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.class', 'support.type'], settings: { foreground: '#9a9a9a' } },
    { scope: ['variable', 'variable.other', 'meta.object-literal.key'], settings: { foreground: '#c9c9c9' } },
    { scope: ['entity.name.tag', 'punctuation.definition.tag'], settings: { foreground: '#00ff88' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#9a9a9a' } },
    { scope: ['invalid'], settings: { foreground: '#ff5f5f' } },
  ],
};

// https://astro.build/config
export default defineConfig({
  site: 'https://rxwsxn.com',
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/links') })],
  markdown: {
    shikiConfig: {
      theme: rxDark,
      wrap: false,
    },
  },
});
