import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { unified } from '@astrojs/markdown-remark'
import { remarkAlert } from 'remark-github-blockquote-alert'

// https://astro.build/config
export default defineConfig({
  site: 'https://itshagennothagen.dev',
  integrations: [sitemap()],
  markdown: {
    processor: unified({ remarkPlugins: [remarkAlert] }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
