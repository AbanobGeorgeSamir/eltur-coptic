import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const htmlPath = resolve(root, 'dist/index.html');
const serverEntryPath = resolve(root, 'dist-server/entry-server.js');
const { render } = await import(pathToFileURL(serverEntryPath).href);
const template = await readFile(htmlPath, 'utf8');
const churchName = 'كنيسة موسي النبي ومارمرقس الرسول';
const pages = [
  {
    path: '/',
    file: 'index.html',
    title: `${churchName} | الخدمات الكنسية ومدارس الأحد`,
    description: 'بوابة كنيسة موسي النبي ومارمرقس الرسول بطور سيناء: صلوات الأجبية، قراءة الكتاب المقدس، مدارس الأحد، وخدمات الكنيسة.',
    indexable: true,
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/privacy',
    file: 'privacy.html',
    title: `سياسة الخصوصية | ${churchName}`,
    description: `سياسة الخصوصية واستخدام البيانات في بوابة ${churchName}.`,
    indexable: true,
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/login',
    file: 'login.html',
    title: `تسجيل الدخول | ${churchName}`,
    description: `تسجيل الدخول بأمان إلى بوابة ${churchName}.`,
    indexable: false,
  },
  {
    path: '/register',
    file: 'register.html',
    title: `إنشاء حساب | ${churchName}`,
    description: `إنشاء حساب طالب في بوابة ${churchName}.`,
    indexable: false,
  },
];

const configuredSiteUrl = (
  process.env.VITE_SITE_URL
  || process.env.VERCEL_PROJECT_PRODUCTION_URL
  || 'https://eltur-coptic.vercel.app'
).trim();
const siteUrl = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(configuredSiteUrl)
  ? configuredSiteUrl
  : `https://${configuredSiteUrl}`);
const siteOrigin = siteUrl.origin;

const escapeHtmlAttribute = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

function upsertMeta(html, attribute, key, value) {
  const tag = `<meta ${attribute}="${key}" content="${escapeHtmlAttribute(value)}" />`;
  const matcher = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  if (matcher.test(html)) return html.replace(matcher, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function upsertCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeHtmlAttribute(url)}" />`;
  const matcher = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;
  if (matcher.test(html)) return html.replace(matcher, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function addStructuredData(html, page, canonicalUrl) {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteOrigin}/#organization`,
    name: churchName,
    description: `بوابة الخدمات الروحية والتعليمية في ${churchName}.`,
    url: `${siteOrigin}/`,
    logo: new URL('/favicon.png', siteOrigin).href,
  };
  const organizationTag = `<script type="application/ld+json">${JSON.stringify(organization)}</script>`;
  let result = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, organizationTag);

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteOrigin}/#website`,
    name: churchName,
    url: `${siteOrigin}/`,
    inLanguage: 'ar-EG',
    publisher: { '@id': `${siteOrigin}/#organization` },
  };
  const websiteTag = `<script type="application/ld+json" id="website-schema">${JSON.stringify(website)}</script>`;
  result = result.replace('</head>', `    ${websiteTag}\n  </head>`);

  if (page.indexable) {
    const webpage = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      description: page.description,
      url: canonicalUrl,
      inLanguage: 'ar-EG',
      isPartOf: { '@id': `${siteOrigin}/#website` },
    };
    const webpageTag = `<script type="application/ld+json" id="webpage-schema">${JSON.stringify(webpage)}</script>`;
    result = result.replace('</head>', `    ${webpageTag}\n  </head>`);
  }

  return result;
}

function applyPageMetadata(html, page) {
  const canonicalUrl = new URL(page.path, siteOrigin).href;
  const socialImage = new URL('/icons/Icon-512.png', siteOrigin).href;
  let result = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtmlAttribute(page.title)}</title>`);
  result = upsertMeta(result, 'name', 'description', page.description);
  result = upsertMeta(result, 'name', 'robots', page.indexable ? 'index,follow' : 'noindex,nofollow');
  result = upsertMeta(result, 'property', 'og:title', page.title);
  result = upsertMeta(result, 'property', 'og:description', page.description);
  result = upsertMeta(result, 'property', 'og:url', canonicalUrl);
  result = upsertMeta(result, 'property', 'og:image', socialImage);
  result = upsertMeta(result, 'property', 'og:image:alt', `شعار ${churchName}`);
  result = upsertMeta(result, 'name', 'twitter:title', page.title);
  result = upsertMeta(result, 'name', 'twitter:description', page.description);
  result = upsertMeta(result, 'name', 'twitter:image', socialImage);
  result = upsertMeta(result, 'name', 'twitter:image:alt', `شعار ${churchName}`);
  result = upsertCanonical(result, canonicalUrl);
  return addStructuredData(result, page, canonicalUrl);
}

for (const page of pages) {
  const content = render(page.path);
  const routeHtml = template.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  if (routeHtml === template) throw new Error('Could not find the application root to prerender.');

  const outputPath = resolve(root, 'dist', page.file);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, applyPageMetadata(routeHtml, page), 'utf8');
}

const sitemapPages = pages.filter((page) => page.indexable);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapPages.map((page) => [
    '  <url>',
    `    <loc>${escapeXml(new URL(page.path, siteOrigin).href)}</loc>`,
    `    <changefreq>${page.changefreq}</changefreq>`,
    `    <priority>${page.priority}</priority>`,
    '  </url>',
  ].join('\n')),
  '</urlset>',
  '',
].join('\n');
await writeFile(resolve(root, 'dist/sitemap.xml'), sitemap, 'utf8');

const robotsPath = resolve(root, 'dist/robots.txt');
const robots = await readFile(robotsPath, 'utf8');
const robotsWithoutOldSitemap = robots.replace(/^Sitemap:\s*.*\r?\n?/gim, '').trimEnd();
await writeFile(robotsPath, `${robotsWithoutOldSitemap}\nSitemap: ${siteOrigin}/sitemap.xml\n`, 'utf8');
