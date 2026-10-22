import { useEffect } from 'react';

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export default function Seo({ title, description, indexable = false }) {
  useEffect(() => {
    const configuredSiteUrl = import.meta.env.VITE_SITE_URL;
    const origin = configuredSiteUrl
      ? new URL(configuredSiteUrl).origin
      : import.meta.env.PROD
        ? 'https://eltur-coptic.vercel.app'
        : window.location.origin;
    const canonicalUrl = `${origin}${window.location.pathname}`;
    const socialImage = `${origin}/icons/Icon-512.png`;

    document.title = title;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    setMeta('name', 'description', description);
    setMeta('name', 'robots', indexable ? 'index,follow' : 'noindex,nofollow');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', socialImage);
    setMeta('property', 'og:image:alt', 'شعار كنيسة موسي النبي ومارمرقس الرسول');
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', socialImage);
    setMeta('name', 'twitter:image:alt', 'شعار كنيسة موسي النبي ومارمرقس الرسول');

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [title, description, indexable]);
  return null;
}
