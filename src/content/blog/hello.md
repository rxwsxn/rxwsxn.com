---
title: hello
date: 2026-10-02
summary: First note — why this site exists and what will show up here.
tags: [meta, writing]
---

Welcome. This is the first note on the new site — a small, fast, always-dark
place to put things I build and things I learn.

## why this exists

Most of what I make lives in repos with no explanation attached. This is the
other half: short write-ups, decisions, and the occasional longer piece. Dated,
because the point is to see how the thinking changes over time.

A few things that will show up here:

- notes on building **ai + product** systems — what worked, what didn't
- small engineering write-ups, usually with a code block or two
- links to work as it ships

## how it's built

Astro, static output, one hand-written stylesheet. No framework on the client
except a tiny script for copy-to-clipboard. The whole thing is a handful of
markdown files and a `site.config.ts`.

```ts
// content collections mean the layout never changes when I add a post
const posts = await getCollection('blog', ({ data }) => !data.draft);
```

> If you're reading this and want to say hi, the contact page is one click away.

More soon.
