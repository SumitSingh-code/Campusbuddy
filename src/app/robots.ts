import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/settings/'],
      },
      {
        userAgent: [
          'Googlebot',
          'Google-Extended',
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'PerplexityBot',
          'Bingbot',
          'Applebot',
        ],
        allow: '/',
        disallow: ['/api/', '/settings/'],
      },
    ],
    sitemap: 'https://unigramjind.site/sitemap.xml',
  }
}

