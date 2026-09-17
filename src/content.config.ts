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
          link: z.url().optional(),
        }),
      ),
    }),
})

const roadtrips = defineCollection({
  loader: glob({ pattern: '**/[^_]*.yaml', base: './src/content/roadtrips' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      intro: z.array(z.string()),
      miles: z.number().optional(),
      route: z
        .array(
          z
            .tuple([z.number(), z.number()])
            .refine(
              ([lat, lon]) =>
                lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180,
              { message: 'route points must be [lat, lon]' },
            ),
        )
        .min(2),
      stops: z
        .array(
          z.object({
            title: z.string(),
            lat: z.number().min(-90).max(90),
            lon: z.number().min(-180).max(180),
            date: z.coerce.date(),
            blurb: z.string(),
            images: z
              .array(z.object({ src: image(), alt: z.string() }))
              .default([]),
          }),
        )
        .min(1),
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

export const collections = { albums, posts, roadtrips }
