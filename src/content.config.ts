import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const albums = defineCollection({
  loader: glob({ pattern: '**/[^_]*.yaml', base: './src/content/albums' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      intro: z.array(z.string()),
      entries: z.array(
        z.object({
          images: z.array(z.object({ src: image(), alt: z.string() })).min(1),
          title: z.string(),
          date: z.coerce.date(),
          caption: z.string().optional(),
          link: z.string().url().optional(),
        }),
      ),
    }),
})

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
})

export const collections = { albums, posts }
