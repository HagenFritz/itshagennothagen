import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { remarkAlert } from 'remark-github-blockquote-alert'

// https://astro.build/config
export default defineConfig({
  site: 'https://itshagennothagen.dev',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkAlert],
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
