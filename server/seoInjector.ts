import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { articles, categories, users, enArticles } from "@shared/schema";
import {
  BRAND_FACEBOOK_PUBLISHER,
  BRAND_NAME_AR,
  BRAND_NAME_EN,
  BRAND_OG_IMAGE_PATH,
  BRAND_PRIMARY_DOMAIN,
  BRAND_PRIMARY_URL,
  BRAND_TWITTER_HANDLE,
} from "@shared/branding";
import { eq, or, desc, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { withCache, CACHE_TTL } from "./memoryCache";

const SKIP_PREFIXES = ['/api/', '/src/', '/@fs/', '/assets/', '/@vite/', '/node_modules/'];
const FILE_EXT_REGEX = /\.\w{2,5}$/;

let cachedTemplate: string | null = null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSocialImageFilename(url: string): string | null {
  let storagePath: string | null = null;
  if (url.startsWith('/public-objects/uploads/')) {
    storagePath = `uploads/${url.replace('/public-objects/uploads/', '')}`;
  } else if (url.startsWith('/public-objects/')) {
    storagePath = url.replace('/public-objects/', '');
  } else {
    const bucketMatch = url.match(/^\/api\/public-media\/replit-objstore-[a-f0-9-]+\/public\/(.+)$/);
    if (bucketMatch) {
      storagePath = bucketMatch[1];
    } else if (url.startsWith('/api/public-media/public/')) {
      storagePath = url.replace('/api/public-media/public/', '');
    } else if (url.startsWith('/api/public-media/')) {
      storagePath = url.replace('/api/public-media/', '');
    }
  }
  if (!storagePath) return null;
  return storagePath.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\-_\/]/g, '').replace(/\//g, '_') + '.jpg';
}

function ensureAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return `${baseUrl}/icon.png`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const parsed = parseStorageUrl(url);
  if (parsed) {
    return `${baseUrl}/social-image/${parsed}.jpg`;
  }

  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

function parseStorageUrl(url: string): string | null {
  if (url.startsWith('/public-objects/uploads/')) {
    return `uploads/${url.replace('/public-objects/uploads/', '')}`;
  }
  if (url.startsWith('/public-objects/')) {
    const rest = url.replace('/public-objects/', '');
    return rest;
  }
  const bucketMatch = url.match(/^\/api\/public-media\/replit-objstore-[a-f0-9-]+\/public\/(.+)$/);
  if (bucketMatch) {
    return bucketMatch[1].replace(/\.[^.]+$/, '');
  }
  if (url.startsWith('/api/public-media/public/')) {
    return url.replace('/api/public-media/public/', '').replace(/\.[^.]+$/, '');
  }
  if (url.startsWith('/api/public-media/')) {
    return url.replace('/api/public-media/', '').replace(/\.[^.]+$/, '');
  }
  return null;
}

function truncate(str: string, len: number): string {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len).replace(/\s+\S*$/, '') + '...';
}

function getBaseUrl(req: Request): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) return BRAND_PRIMARY_URL;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['host'] as string) || BRAND_PRIMARY_DOMAIN;
  return `${proto}://${host}`;
}

async function getTemplate(): Promise<string> {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && cachedTemplate) return cachedTemplate;

  const templatePath = isProduction
    ? path.resolve(import.meta.dirname, 'public', 'index.html')
    : path.resolve(import.meta.dirname, '..', 'client', 'index.html');

  const template = await fs.promises.readFile(templatePath, 'utf-8');
  if (isProduction) {
    cachedTemplate = template;
  }
  return template;
}

interface SeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: string;
  ogImage: string;
  ogLocale: string;
  ogSiteName: string;
  publishedTime?: string;
  modifiedTime?: string;
  articleSection?: string;
  articleTags?: string[];
  articleAuthor?: string;
  twitterSite: string;
  jsonLd?: object;
  semanticHtml?: string;
  preloadImage?: string;
  robots?: string;
  hreflangLinks?: Array<{ lang: string; href: string }>;
}

function injectSeoIntoHtml(html: string, seo: SeoData): string {
  const safeTitle = escapeHtml(seo.title);
  const safeDesc = escapeHtml(seo.description);
  const safeCanonical = escapeHtml(seo.canonicalUrl);
  const safeImage = escapeHtml(seo.ogImage);
  const safeSiteName = escapeHtml(seo.ogSiteName);

  let result = html.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);

  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${safeDesc}">`
  );

  result = result.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>\s*\n?/g, '');
  result = result.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>\s*\n?/g, '');
  result = result.replace(/<meta\s+property="twitter:[^"]*"\s+content="[^"]*"\s*\/?>\s*\n?/g, '');

  const isArticlePage = seo.ogType === 'article' && !!seo.publishedTime;
  let robotsContent = seo.robots || (isArticlePage ? 'index, follow, max-image-preview:large' : 'index, follow');

  let googleNewsRobotsTag = '';
  if (isArticlePage && seo.publishedTime) {
    const pubDate = new Date(seo.publishedTime);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    if (pubDate < thirtyDaysAgo) {
      googleNewsRobotsTag = '\n  <meta name="googlebot-news" content="noindex">';
    }
    if (pubDate < oneYearAgo) {
      robotsContent = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1, noarchive';
    }
  }

  const hreflangTags = seo.hreflangLinks
    ? seo.hreflangLinks.map(hl => `<link rel="alternate" hreflang="${escapeHtml(hl.lang)}" href="${escapeHtml(hl.href)}">`).join('\n  ')
    : '';

  const metaTags = `
  <!-- SEO Injected Meta Tags -->
  <link rel="canonical" href="${safeCanonical}">
  <meta name="robots" content="${escapeHtml(robotsContent)}">${googleNewsRobotsTag}
  ${hreflangTags}
  <meta property="og:type" content="${escapeHtml(seo.ogType)}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${safeSiteName}">
  <meta property="og:locale" content="${escapeHtml(seo.ogLocale)}">
  ${seo.publishedTime ? `<meta property="article:published_time" content="${escapeHtml(seo.publishedTime)}">` : ''}
  ${seo.modifiedTime ? `<meta property="article:modified_time" content="${escapeHtml(seo.modifiedTime)}">` : ''}
  ${seo.articleSection ? `<meta property="article:section" content="${escapeHtml(seo.articleSection)}">` : ''}
  ${seo.articleTags ? seo.articleTags.map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join('\n  ') : ''}
  <meta property="article:author" content="${escapeHtml(seo.articleAuthor || BRAND_NAME_AR)}">
  <meta property="article:publisher" content="${escapeHtml(BRAND_FACEBOOK_PUBLISHER)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="${escapeHtml(seo.twitterSite)}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  ${seo.jsonLd ? `<script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
  <!-- End SEO Injected -->`;

  result = result.replace('</head>', `${metaTags}\n</head>`);

  if (seo.preloadImage) {
    const preloadTag = `<link rel="preload" as="image" href="${escapeHtml(seo.preloadImage)}" fetchpriority="high">\n`;
    result = result.replace('</head>', `${preloadTag}</head>`);
  }

  if (seo.semanticHtml) {
    result = result.replace(
      '<div id="root">',
      `<div id="root">${seo.semanticHtml}`
    );
  }

  return result;
}

async function handleArticlePage(slug: string, baseUrl: string, urlPrefix: string): Promise<SeoData | null> {
  const article = await withCache(`seo:article:${slug}`, CACHE_TTL.LONG, async () =>
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        englishSlug: articles.englishSlug,
        excerpt: articles.excerpt,
        imageUrl: articles.imageUrl,
        aiSummary: articles.aiSummary,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
        seo: articles.seo,
        status: articles.status,
        categoryName: categories.nameAr,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(or(eq(articles.slug, slug), eq(articles.englishSlug, slug)))
      .limit(1)
  );

  if (!article.length) return null;
  if (article[0].status === 'deleted') return { _gone: true } as any;

  const a = article[0];
  const seoData = (a.seo as any) || {};
  const title = a.title || seoData.metaTitle || '';
  const description = truncate(seoData.metaDescription || a.excerpt || a.aiSummary || '', 220);
  const image = ensureAbsoluteUrl(a.imageUrl || '', baseUrl);
  const canonicalSlug = a.englishSlug || a.slug;
  const canonicalUrl = `${baseUrl}/${urlPrefix}/${canonicalSlug}`;
  const authorName = [a.authorFirstName, a.authorLastName].filter(Boolean).join(' ') || 'بروبرتي ميدل إيست';
  const publishedTime = a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined;
  let modifiedTime = a.updatedAt ? new Date(a.updatedAt).toISOString() : publishedTime;
  if (publishedTime && modifiedTime && a.publishedAt && a.updatedAt) {
    const pubMs = new Date(a.publishedAt).getTime();
    const updMs = new Date(a.updatedAt).getTime();
    const articleAgeMs = Date.now() - pubMs;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (articleAgeMs > thirtyDaysMs && (updMs - pubMs) > 7 * 24 * 60 * 60 * 1000) {
      modifiedTime = publishedTime;
    }
  }
  const keywords = seoData.keywords || [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
    "headline": title,
    "description": description,
    "image": [image],
    "datePublished": publishedTime,
    "dateModified": modifiedTime,
    "author": { "@type": "Person", "name": authorName },
    "publisher": {
      "@type": "NewsMediaOrganization",
      "name": "بروبرتي ميدل إيست",
      "logo": { "@type": "ImageObject", "url": `${baseUrl}${BRAND_OG_IMAGE_PATH}` }
    },
    "articleSection": a.categoryName || undefined,
    "keywords": keywords.length > 0 ? keywords : undefined,
  };

  const safeTitle = escapeHtml(title);
  const safeExcerpt = escapeHtml(truncate(a.excerpt || a.aiSummary || '', 300));
  const semanticHtml = `<article style="position:absolute;left:-9999px;"><h1>${safeTitle}</h1>${publishedTime ? `<time datetime="${publishedTime}">${publishedTime}</time>` : ''}<p>${safeExcerpt}</p></article>`;

  const hreflangLinks: Array<{ lang: string; href: string }> = [
    { lang: 'ar', href: canonicalUrl },
    { lang: 'x-default', href: canonicalUrl },
  ];
  if (a.englishSlug) {
    hreflangLinks.push({ lang: 'en', href: `${baseUrl}/en/article/${a.englishSlug}` });
  }

  return {
    title: `${title} — بروبرتي ميدل إيست`,
    description,
    canonicalUrl,
    ogType: 'article',
    ogImage: image,
    ogLocale: 'ar_SA',
    ogSiteName: 'بروبرتي ميدل إيست - Property Middle East',
    publishedTime,
    modifiedTime,
    articleSection: a.categoryName || undefined,
    articleTags: keywords.length > 0 ? keywords : undefined,
    articleAuthor: authorName,
    twitterSite: BRAND_TWITTER_HANDLE,
    jsonLd,
    semanticHtml,
    preloadImage: image,
    hreflangLinks,
  };
}

async function handleEnArticlePage(slug: string, baseUrl: string): Promise<SeoData | null> {
  const article = await withCache(`seo:en-article:${slug}`, CACHE_TTL.LONG, async () =>
    db
      .select({
        id: enArticles.id,
        title: enArticles.title,
        slug: enArticles.slug,
        englishSlug: enArticles.englishSlug,
        excerpt: enArticles.excerpt,
        imageUrl: enArticles.imageUrl,
        aiSummary: enArticles.aiSummary,
        publishedAt: enArticles.publishedAt,
        updatedAt: enArticles.updatedAt,
        seo: enArticles.seo,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(enArticles)
      .leftJoin(users, eq(enArticles.authorId, users.id))
      .where(or(eq(enArticles.slug, slug), eq(enArticles.englishSlug, slug)))
      .limit(1)
  );

  if (!article.length) return null;

  const a = article[0];
  const seoData = (a.seo as any) || {};
  const title = a.title || seoData.metaTitle || '';
  const description = truncate(seoData.metaDescription || a.excerpt || a.aiSummary || '', 220);
  const image = ensureAbsoluteUrl(a.imageUrl || '', baseUrl);
  const articleSlug = a.englishSlug || a.slug;
  const canonicalUrl = `${baseUrl}/en/article/${articleSlug}`;
  const authorName = [a.authorFirstName, a.authorLastName].filter(Boolean).join(' ') || 'Property Middle East';
  const publishedTime = a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined;
  let modifiedTime = a.updatedAt ? new Date(a.updatedAt).toISOString() : publishedTime;
  if (publishedTime && modifiedTime && a.publishedAt && a.updatedAt) {
    const pubMs = new Date(a.publishedAt).getTime();
    const updMs = new Date(a.updatedAt).getTime();
    const articleAgeMs = Date.now() - pubMs;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (articleAgeMs > thirtyDaysMs && (updMs - pubMs) > 7 * 24 * 60 * 60 * 1000) {
      modifiedTime = publishedTime;
    }
  }
  const keywords = seoData.keywords || [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
    "headline": title,
    "description": description,
    "image": [image],
    "datePublished": publishedTime,
    "dateModified": modifiedTime,
    "author": { "@type": "Person", "name": authorName },
    "publisher": {
      "@type": "NewsMediaOrganization",
      "name": "Property Middle East",
      "logo": { "@type": "ImageObject", "url": `${baseUrl}${BRAND_OG_IMAGE_PATH}` }
    },
    "keywords": keywords.length > 0 ? keywords : undefined,
  };

  const safeTitle = escapeHtml(title);
  const safeExcerpt = escapeHtml(truncate(a.excerpt || a.aiSummary || '', 300));
  const semanticHtml = `<article style="position:absolute;left:-9999px;"><h1>${safeTitle}</h1>${publishedTime ? `<time datetime="${publishedTime}">${publishedTime}</time>` : ''}<p>${safeExcerpt}</p></article>`;

  const arSlug = a.englishSlug || a.slug;
  const hreflangLinks: Array<{ lang: string; href: string }> = [
    { lang: 'en', href: canonicalUrl },
  ];
  if (arSlug) {
    hreflangLinks.push(
      { lang: 'ar', href: `${baseUrl}/article/${arSlug}` },
      { lang: 'x-default', href: `${baseUrl}/article/${arSlug}` },
    );
  }

  return {
    title: `${title} — Property Middle East`,
    description,
    canonicalUrl,
    ogType: 'article',
    ogImage: image,
    ogLocale: 'en_US',
    ogSiteName: 'بروبرتي ميدل إيست - Property Middle East',
    publishedTime,
    modifiedTime,
    twitterSite: BRAND_TWITTER_HANDLE,
    jsonLd,
    semanticHtml,
    preloadImage: image,
    hreflangLinks,
  };
}

async function handleCategoryPage(slug: string, baseUrl: string): Promise<SeoData | null> {
  const category = await withCache(`seo:category:${slug}`, CACHE_TTL.LONG, async () =>
    db
      .select({
        id: categories.id,
        nameAr: categories.nameAr,
        slug: categories.slug,
        englishSlug: categories.englishSlug,
        description: categories.description,
        heroImageUrl: categories.heroImageUrl,
      })
      .from(categories)
      .where(or(eq(categories.slug, slug), eq(categories.englishSlug, slug)))
      .limit(1)
  );

  if (!category.length) return null;

  const c = category[0];
  const title = `${c.nameAr} — بروبرتي ميدل إيست`;
  const description = c.description || `أخبار ${c.nameAr} على مدار الساعة من بروبرتي ميدل إيست`;
  const image = ensureAbsoluteUrl(c.heroImageUrl || '', baseUrl);
  const canonicalSlug = c.englishSlug || c.slug;
  const canonicalUrl = `${baseUrl}/category/${canonicalSlug}`;

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'website',
    ogImage: image,
    ogLocale: 'ar_SA',
    ogSiteName: 'بروبرتي ميدل إيست - Property Middle East',
    twitterSite: BRAND_TWITTER_HANDLE,
  };
}

async function handleHomepage(baseUrl: string): Promise<SeoData> {
  const recentArticles = await db
    .select({
      title: articles.title,
      slug: articles.slug,
      englishSlug: articles.englishSlug,
      imageUrl: articles.imageUrl,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(30);

  const heroImage = recentArticles.length > 0 ? ensureAbsoluteUrl(recentArticles[0].imageUrl || '', baseUrl) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "بروبرتي ميدل إيست",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  let semanticHtml = '';
  if (recentArticles.length > 0) {
    const links = recentArticles.map(a => {
      const safeTitle = escapeHtml(a.title || '');
      const href = `/article/${a.englishSlug || a.slug}`;
      return `<li><a href="${href}">${safeTitle}</a></li>`;
    }).join('');
    semanticHtml = `<nav aria-label="آخر الأخبار" style="position:absolute;left:-9999px;"><h2>آخر الأخبار</h2><ul>${links}</ul></nav>`;
  }

  return {
    title: 'Property Middle East - بروبرتي ميدل إيست - المنصة الأولى لأخبار العقار في الشرق الأوسط',
    description: 'بروبرتي ميدل إيست هي المنصة الرائدة لأخبار العقارات في منطقة الشرق الأوسط. نحن نلتزم بأعلى المعايير لتقديم تغطية شاملة لسوق العقارات المتغير في المنطقة، مع تحليلات متخصصة وقصص فريدة تعزز فهمك لهذا القطاع المثير.',
    canonicalUrl: baseUrl,
    ogType: 'website',
    ogImage: `${baseUrl}${BRAND_OG_IMAGE_PATH}`,
    ogLocale: 'ar_SA',
    ogSiteName: 'بروبرتي ميدل إيست - Property Middle East',
    twitterSite: BRAND_TWITTER_HANDLE,
    jsonLd,
    semanticHtml,
    preloadImage: heroImage,
  };
}

function matchRoute(pathname: string): { type: string; slug?: string } | null {
  if (pathname === '/' || pathname === '') return { type: 'homepage' };
  if (pathname === '/en' || pathname === '/ar') return { type: 'homepage' };

  let match = pathname.match(/^\/article\/([^/]+)$/);
  if (match) return { type: 'article', slug: match[1] };

  match = pathname.match(/^\/opinion\/([^/]+)$/);
  if (match) return { type: 'opinion', slug: match[1] };

  match = pathname.match(/^\/en\/article\/([^/]+)$/);
  if (match) return { type: 'en-article', slug: match[1] };

  match = pathname.match(/^\/category\/([^/]+)$/);
  if (match) return { type: 'category', slug: match[1] };

  if (pathname === '/sponsored') return { type: 'sponsored' };

  if (pathname === '/search') return { type: 'noindex-page' };

  const STATIC_INDEXABLE: Record<string, { title: string; desc: string }> = {
    '/categories': { title: 'التصنيفات — بروبرتي ميدل إيست', desc: 'استكشف تصنيفات الأخبار في بروبرتي ميدل إيست' },
    '/en/categories': { title: 'Categories — Property Middle East', desc: 'Browse all news categories on Property Middle East' },
    '/opinion': { title: 'الرأي — بروبرتي ميدل إيست', desc: 'مقالات الرأي والتحليل في بروبرتي ميدل إيست' },
    '/about': { title: 'من نحن — بروبرتي ميدل إيست', desc: 'تعرف على بروبرتي ميدل إيست ورسالتها' },
    '/privacy': { title: 'سياسة الخصوصية — بروبرتي ميدل إيست', desc: 'سياسة خصوصية بروبرتي ميدل إيست' },
    '/terms': { title: 'شروط الاستخدام — بروبرتي ميدل إيست', desc: 'شروط استخدام بروبرتي ميدل إيست' },
    '/contact': { title: 'اتصل بنا — بروبرتي ميدل إيست', desc: 'تواصل مع فريق بروبرتي ميدل إيست' },
    '/daily-brief': { title: 'الموجز اليومي — بروبرتي ميدل إيست', desc: 'ملخص يومي لأهم الأحداث والأخبار من بروبرتي ميدل إيست' },
    '/shorts': { title: 'أخبار قصيرة — بروبرتي ميدل إيست', desc: 'أخبار سريعة ومختصرة من بروبرتي ميدل إيست' },
  };

  if (STATIC_INDEXABLE[pathname]) return { type: 'static-page', slug: pathname };

  return null;
}

interface RouteMatch {
  type: string;
  slug?: string;
  query?: Record<string, string>;
}

async function handleSponsoredPage(baseUrl: string, mvi?: string): Promise<SeoData> {
  const canonicalUrl = mvi ? `${baseUrl}/sponsored?mvi=${mvi}` : `${baseUrl}/sponsored`;
  
  let title = 'محتوى مُموّل — بروبرتي ميدل إيست';
  let description = 'محتوى مُموّل على بروبرتي ميدل إيست';
  let ogImage = `${baseUrl}${BRAND_OG_IMAGE_PATH}`;
  
  if (mvi) {
    try {
      const data = await withCache(`seo:sponsored:${mvi}`, CACHE_TTL.MEDIUM, async () => {
        const response = await fetch(`https://polarcdn-terrax.com/nativeads/v1.4.0/json/creative/${mvi}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          return response.json();
        }
        return null;
      });
      if (data?.experience?.title) {
        title = `${data.experience.title} — بروبرتي ميدل إيست`;
        description = data.experience.title;
      }
      if (data?.primaryMedia?.content?.href) {
        const imgHref = data.primaryMedia.content.href;
        ogImage = imgHref.startsWith('http') ? imgHref : `https://polarcdn-terrax.com${imgHref.startsWith('/') ? '' : '/'}${imgHref}`;
      }
    } catch (e) {
      console.warn('[SEO] Failed to fetch sponsored content for OG tags:', e);
    }
  }
  
  return {
    title,
    description,
    canonicalUrl,
    ogType: 'article',
    ogImage,
    ogLocale: 'ar_SA',
    ogSiteName: 'بروبرتي ميدل إيست - Property Middle East',
    twitterSite: BRAND_TWITTER_HANDLE,
  };
}

async function resolveSeoData(route: { type: string; slug?: string; mvi?: string }, baseUrl: string): Promise<SeoData | null> {
  switch (route.type) {
    case 'article':
      return handleArticlePage(route.slug!, baseUrl, 'article');
    case 'opinion':
      return handleArticlePage(route.slug!, baseUrl, 'opinion');
    case 'en-article':
      return handleEnArticlePage(route.slug!, baseUrl);
    case 'category':
      return handleCategoryPage(route.slug!, baseUrl);
    case 'homepage':
      return handleHomepage(baseUrl);
    case 'sponsored':
      return handleSponsoredPage(baseUrl, route.mvi);
    case 'noindex-page':
      return {
        title: 'البحث — بروبرتي ميدل إيست',
        description: 'ابحث في أخبار بروبرتي ميدل إيست',
        canonicalUrl: `${baseUrl}/search`,
        ogType: 'website',
        ogImage: `${baseUrl}${BRAND_OG_IMAGE_PATH}`,
        ogLocale: 'ar_SA',
        ogSiteName: 'بروبرتي ميدل إيست - Property Middle East',
        twitterSite: BRAND_TWITTER_HANDLE,
        robots: 'noindex, follow',
      };
    case 'static-page': {
      const STATIC_INDEXABLE: Record<string, { title: string; desc: string }> = {
        '/categories': { title: 'التصنيفات — بروبرتي ميدل إيست', desc: 'استكشف تصنيفات الأخبار في بروبرتي ميدل إيست' },
        '/en/categories': { title: 'Categories — Property Middle East', desc: 'Browse all news categories on Property Middle East' },
        '/opinion': { title: 'الرأي — بروبرتي ميدل إيست', desc: 'مقالات الرأي والتحليل في بروبرتي ميدل إيست' },
        '/about': { title: 'من نحن — بروبرتي ميدل إيست', desc: 'تعرف على بروبرتي ميدل إيست ورسالتها' },
        '/privacy': { title: 'سياسة الخصوصية — بروبرتي ميدل إيست', desc: 'سياسة خصوصية بروبرتي ميدل إيست' },
        '/terms': { title: 'شروط الاستخدام — بروبرتي ميدل إيست', desc: 'شروط استخدام بروبرتي ميدل إيست' },
        '/contact': { title: 'اتصل بنا — بروبرتي ميدل إيست', desc: 'تواصل مع فريق بروبرتي ميدل إيست' },
        '/daily-brief': { title: 'الموجز اليومي — بروبرتي ميدل إيست', desc: 'ملخص يومي لأهم الأحداث والأخبار من بروبرتي ميدل إيست' },
        '/shorts': { title: 'أخبار قصيرة — بروبرتي ميدل إيست', desc: 'أخبار سريعة ومختصرة من بروبرتي ميدل إيست' },
      };
      const page = STATIC_INDEXABLE[route.slug!];
      if (!page) return null;
      return {
        title: page.title,
        description: page.desc,
        canonicalUrl: `${baseUrl}${route.slug}`,
        ogType: 'website',
        ogImage: `${baseUrl}${BRAND_OG_IMAGE_PATH}`,
        ogLocale: route.slug!.startsWith('/en') ? 'en_US' : 'ar_SA',
        ogSiteName: 'بروبرتي ميدل إيست - Property Middle East',
        twitterSite: BRAND_TWITTER_HANDLE,
      };
    }
    default:
      return null;
  }
}

export async function seoInjectorMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const pathname = req.path;

    if (SKIP_PREFIXES.some(prefix => pathname.startsWith(prefix))) return next();
    if (FILE_EXT_REGEX.test(pathname)) return next();
    if (req.method !== 'GET') return next();

    const hasTrackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 'ref'].some(p => req.query[p]);
    const hasFilterParams = ['sort', 'filter'].some(p => req.query[p]);
    const pageNum = parseInt(req.query.page as string) || 0;
    const shouldNoindex = hasTrackingParams || hasFilterParams || pageNum > 5;

    const route = matchRoute(pathname);
    if (!route) return next();

    if (route.type === 'sponsored' && req.query.mvi) {
      (route as any).mvi = String(req.query.mvi);
    }

    const baseUrl = getBaseUrl(req);
    const seoData = await resolveSeoData(route, baseUrl);

    if (!seoData) {
      console.log(`[SEO] No data found for ${route.type}: ${route.slug}`);
      return next();
    }

    if ((seoData as any)._gone) {
      console.log(`[SEO/410] Deleted content: ${route.slug} - returning 410 Gone`);
      return res.status(410).send('<!DOCTYPE html><html><head><meta name="robots" content="noindex"></head><body><h1>410 Gone</h1><p>This content has been permanently removed.</p></body></html>');
    }

    if (shouldNoindex) {
      seoData.robots = 'noindex, follow';
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      const template = await getTemplate();
      let html = injectSeoIntoHtml(template, seoData);

      if (route.type === 'homepage') {
        try {
          const { swrCache } = await import("./memoryCache");
          const cacheKey = 'homepage-lite';
          const cached = swrCache.get<any>(cacheKey);
          if (cached.data) {
            const safeJson = JSON.stringify(cached.data).replace(/</g, '\\u003c');
            const inlineScript = `<script>window.__HOMEPAGE_DATA__=${safeJson};</script>`;
            html = html.replace('</head>', `${inlineScript}\n</head>`);
          }
        } catch (e) {
        }
      }

      console.log(`[SEO] Injected meta tags for ${route.type}: ${route.slug || '/'}`);

      const headers: Record<string, string> = {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      };

      if (seoData.publishedTime) {
        const pubAge = Date.now() - new Date(seoData.publishedTime).getTime();
        if (pubAge > 365 * 24 * 60 * 60 * 1000) {
          headers['X-Robots-Tag'] = 'max-snippet:-1, noarchive';
        }
      }

      res.status(200).set(headers).send(html);
    } else {
      if (seoData.publishedTime) {
        const pubAge = Date.now() - new Date(seoData.publishedTime).getTime();
        if (pubAge > 365 * 24 * 60 * 60 * 1000) {
          res.set('X-Robots-Tag', 'max-snippet:-1, noarchive');
        }
      }

      const origEnd = res.end.bind(res);

      (res as any).end = function(chunk: any, encoding?: any, cb?: any): Response {
        const body = typeof chunk === 'string'
          ? chunk
          : (Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : '');

        if (body && body.includes('<title>') && body.includes('<div id="root">')) {
          const injected = injectSeoIntoHtml(body, seoData!);
          console.log(`[SEO:dev] Injected meta tags for ${route.type}: ${route.slug || '/'}`);
          return origEnd(injected, 'utf-8', cb);
        }

        return origEnd(chunk, encoding, cb);
      };

      next();
    }
  } catch (error) {
    console.error('[SEO] Error in SEO injector middleware:', error);
    next();
  }
}
