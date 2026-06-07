/**
 * useSEO — shared meta injection hook
 * Sets document.title, meta tags, OG, Twitter, canonical, and JSON-LD.
 * Cleans up injected JSON-LD scripts on unmount / next call.
 */
import { useEffect } from "react";

export interface SEOOptions {
  title: string;
  description?: string;
  keywords?: string[];
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  ogLocale?: string;
  siteName?: string;
  robots?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  schemaId?: string;
}

function setMetaTag(name: string, content: string, isProp = false) {
  const attr = isProp ? "property" : "name";
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function injectJsonLd(data: Record<string, any> | Record<string, any>[], id: string) {
  const schemaId = `schema-${id}`;
  let script = document.querySelector<HTMLScriptElement>(`script[data-schema="${schemaId}"]`);
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-schema", schemaId);
    document.head.appendChild(script);
  }
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : data;
  script.textContent = JSON.stringify(payload);
  return schemaId;
}

function removeJsonLd(schemaId: string) {
  const el = document.querySelector(`script[data-schema="schema-${schemaId}"]`);
  el?.remove();
}

export function useSEO(options: SEOOptions | null) {
  useEffect(() => {
    if (!options) return;

    const {
      title,
      description,
      keywords,
      canonicalPath,
      ogType = "website",
      ogImage,
      ogLocale = "id_ID",
      siteName = "Vinstour Travel",
      robots = "index, follow",
      jsonLd,
      schemaId = "page",
    } = options;

    document.title = title;

    if (description) setMetaTag("description", description);
    if (keywords?.length) setMetaTag("keywords", keywords.join(", "));
    setMetaTag("robots", robots);

    setMetaTag("og:title", title, true);
    setMetaTag("og:type", ogType, true);
    setMetaTag("og:locale", ogLocale, true);
    setMetaTag("og:site_name", siteName, true);
    if (description) setMetaTag("og:description", description, true);
    if (ogImage) setMetaTag("og:image", ogImage, true);

    const canonical = canonicalPath
      ? `${window.location.origin}${canonicalPath}`
      : window.location.href.split("?")[0];
    setMetaTag("og:url", canonical, true);
    setCanonical(canonical);

    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", title);
    if (description) setMetaTag("twitter:description", description);
    if (ogImage) setMetaTag("twitter:image", ogImage);

    if (jsonLd) injectJsonLd(jsonLd, schemaId);

    return () => {
      if (jsonLd) removeJsonLd(schemaId);
    };
  }, [
    options?.title,
    options?.description,
    options?.ogImage,
    options?.canonicalPath,
    options?.schemaId,
  ]);
}
