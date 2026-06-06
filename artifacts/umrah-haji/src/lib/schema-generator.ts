/**
 * JSON-LD Schema Generator
 * Generates structured data markup for SEO
 */

export interface SchemaGeneratorOptions {
  pageType: string;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  companyName?: string;
  companyLogo?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
}

/**
 * Generate TravelAgency schema for homepage
 */
export function generateTravelAgencySchema(options: SchemaGeneratorOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: options.companyName || options.title,
    description: options.description,
    url: options.url,
    logo: options.companyLogo,
    image: options.imageUrl,
    ...(options.contactPhone && { telephone: options.contactPhone }),
    ...(options.contactEmail && { email: options.contactEmail }),
    ...(options.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: options.address,
      },
    }),
    sameAs: [
      "https://www.facebook.com/",
      "https://www.instagram.com/",
      "https://www.youtube.com/",
    ],
  };
}

/**
 * Generate Organization schema for about page
 */
export function generateOrganizationSchema(options: SchemaGeneratorOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: options.companyName || options.title,
    description: options.description,
    url: options.url,
    logo: options.companyLogo,
    ...(options.contactPhone && { telephone: options.contactPhone }),
    ...(options.contactEmail && { email: options.contactEmail }),
    ...(options.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: options.address,
      },
    }),
  };
}

/**
 * Generate Product schema for packages
 */
export function generateProductSchema(options: SchemaGeneratorOptions & {
  price?: number;
  currency?: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: options.title,
    description: options.description,
    image: options.imageUrl,
    url: options.url,
    brand: {
      "@type": "Brand",
      name: options.companyName,
    },
    ...(options.price && {
      offers: {
        "@type": "Offer",
        price: options.price,
        priceCurrency: options.currency || "IDR",
        availability: options.availability || "https://schema.org/InStock",
        url: options.url,
      },
    }),
    ...(options.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: options.rating,
        reviewCount: options.reviewCount || 0,
      },
    }),
  };
}

/**
 * Generate ContactPage schema
 */
export function generateContactPageSchema(options: SchemaGeneratorOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: options.title,
    description: options.description,
    url: options.url,
    mainEntity: {
      "@type": "Organization",
      name: options.companyName,
      ...(options.contactPhone && { telephone: options.contactPhone }),
      ...(options.contactEmail && { email: options.contactEmail }),
      ...(options.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: options.address,
        },
      }),
    },
  };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQPageSchema(options: SchemaGeneratorOptions & {
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: options.title,
    description: options.description,
    url: options.url,
    mainEntity: (options.faqs || []).map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate LocalBusiness schema
 */
export function generateLocalBusinessSchema(options: SchemaGeneratorOptions & {
  businessType?: string;
  openingHours?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": options.businessType || "LocalBusiness",
    name: options.companyName || options.title,
    description: options.description,
    url: options.url,
    image: options.companyLogo,
    ...(options.contactPhone && { telephone: options.contactPhone }),
    ...(options.contactEmail && { email: options.contactEmail }),
    ...(options.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: options.address,
      },
    }),
    ...(options.openingHours && {
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "08:00",
        closes: "17:00",
      },
    }),
  };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{
  name: string;
  url: string;
}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate WebPage schema (generic)
 */
/**
 * Generate Article/BlogPosting schema
 */
export function generateArticleSchema(options: SchemaGeneratorOptions & {
  authorName?: string;
  publishedDate?: string;
  modifiedDate?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: options.title,
    description: options.description,
    image: options.imageUrl,
    url: options.url,
    datePublished: options.publishedDate || new Date().toISOString(),
    dateModified: options.modifiedDate || options.publishedDate || new Date().toISOString(),
    author: {
      "@type": "Person",
      name: options.authorName || options.companyName || "Vinstour Travel",
    },
    publisher: {
      "@type": "Organization",
      name: options.companyName || "Vinstour Travel",
      logo: {
        "@type": "ImageObject",
        url: options.companyLogo || "", // Replace with actual logo URL
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": options.url,
    },
  };
}

/**
 * Generate WebPage schema (generic)
 */
export function generateWebPageSchema(options: SchemaGeneratorOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: options.title,
    description: options.description,
    url: options.url,
    image: options.imageUrl,
    datePublished: new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: options.companyName,
    },
  };
}

/**
 * Generate schema based on page type
 */
export function generateSchema(
  pageType: string,
  options: SchemaGeneratorOptions & {
    faqs?: Array<{ question: string; answer: string }>;
    price?: number;
    currency?: string;
    availability?: string;
    rating?: number;
    reviewCount?: number;
    businessType?: string;
    openingHours?: string;
  }
) {
  switch (pageType) {
    case "TravelAgency":
      return generateTravelAgencySchema(options);
    case "Organization":
      return generateOrganizationSchema(options);
    case "Product":
      return generateProductSchema(options);
    case "ContactPage":
      return generateContactPageSchema(options);
    case "FAQPage":
      return generateFAQPageSchema(options);
    case "LocalBusiness":
      return generateLocalBusinessSchema(options);
    case "Article":
      return generateArticleSchema(options);
    default:
      return generateWebPageSchema(options);
  }
}

/**
 * Convert schema object to JSON-LD script tag
 */
export function schemaToScriptTag(schema: any): string {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}
