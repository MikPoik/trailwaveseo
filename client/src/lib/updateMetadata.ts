
/**
 * Updates document metadata (title and meta tags) on client-side
 */
export function updateMetadata(metadata: {
  title?: string;
  description?: string;
  canonical?: string;
}) {
  // Update title
  if (metadata.title) {
    document.title = metadata.title;
  }

  // Update or create meta description
  if (metadata.description) {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', metadata.description);
  }

  // Update or create canonical link
  if (metadata.canonical) {
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = metadata.canonical;
  }
}
