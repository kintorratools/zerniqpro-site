import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import starlight from '@astrojs/starlight';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // https://docs.astro.build/en/guides/images/#authorizing-remote-images
  outDir: './dist-out',
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  image: {
    domains: ['images.unsplash.com'],
  },
  // i18n: {
  //   defaultLocale: "en",
  //   locales: ["en", "fr"],
  //   fallback: {
  //     fr: "en",
  //   },
  //   routing: {
  //     prefixDefaultLocale: false,
  //   },
  // },
  prefetch: true,
  env: {
    schema: {
      CMS_SITE_KEY: envField.string({
        context: 'server',
        access: 'secret',
        default: 'site-template',
      }),
      CMS_REQUEST_TIMEOUT_MS: envField.number({
        context: 'server',
        access: 'public',
        default: 8000,
      }),
      STRAPI_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      STRAPI_API_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [
    starlight({
      title: 'Documentation',
      // https://github.com/withastro/starlight/blob/main/packages/starlight/CHANGELOG.md
      // If no Astro and Starlight i18n configurations are provided, the built-in default locale is used in Starlight and a matching Astro i18n configuration is generated/used.
      // If only a Starlight i18n configuration is provided, an equivalent Astro i18n configuration is generated/used.
      // If only an Astro i18n configuration is provided, the Starlight i18n configuration is updated to match it.
      // If both an Astro and Starlight i18n configurations are provided, an error is thrown.
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        fr: { label: 'Français', lang: 'fr' },
      },
      // https://starlight.astro.build/guides/sidebar/
      sidebar: [
        {
          label: 'Quick Start Guides',
          translations: {
            de: 'Schnellstartanleitungen',
            es: 'Guías de Inicio Rápido',
            fr: 'Guides de Démarrage Rapide',
            'pt-BR': 'Guias de Início Rápido',
          },
          items: [{ autogenerate: { directory: 'guides' } }],
        },
        {
          label: 'Tools & Equipment',
          // Translated guide intros exist per locale; these pages fall back to English.
          translations: {
            de: 'Werkzeuge & Ausrüstung',
            es: 'Herramientas y Equipo',
            fr: 'Outils et Équipement',
            'pt-BR': 'Ferramentas e Equipamentos',
          },
          items: [
            { label: 'Tool Guides', link: 'tools/tool-guides/' },
            { label: 'Equipment Care', link: 'tools/equipment-care/' },
          ],
        },
        {
          label: 'Construction Services',
          translations: {
            de: 'Baudienstleistungen',
            es: 'Servicios de Construcción',
            fr: 'Services de Construction',
            'pt-BR': 'Serviços de Construção',
          },
          items: [{ autogenerate: { directory: 'construction' } }],
        },
        {
          label: 'Advanced Topics',
          items: [{ autogenerate: { directory: 'advanced' } }],
        },
      ],
      social: [],
      disable404Route: true,
      customCss: ['./src/assets/styles/starlight.css'],
      favicon: '/favicon.ico',
      components: {
        SiteTitle: './src/components/ui/starlight/SiteTitle.astro',
        Head: './src/components/ui/starlight/Head.astro',
        MobileMenuFooter:
          './src/components/ui/starlight/MobileMenuFooter.astro',
        ThemeSelect: './src/components/ui/starlight/ThemeSelect.astro',
      },
    }),
    mdx(),
    sitemap(),
  ],
  experimental: {
    clientPrerender: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
