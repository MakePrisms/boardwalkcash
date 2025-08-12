import type { MetaDescriptor } from 'react-router';
import useLocationData from '~/hooks/use-location';

const defaultTitle = 'Agicash';
const defaultDescription = 'The easiest way to send and receive cash.';
const defaultImage = '/icon-192x192.png';
const defaultImageWidth = '192';
const defaultImageHeight = '192';
const defaultImageType = 'image/png';
const defaultImageAlt = 'Agicash logo';
const defaultOgSiteName = 'Agicash';

/**
 * Options for creating meta tags.
 * Undefined values will be replaced with the default values.
 */
type MetaOptions = {
  /**
   * The title of the page. This will be used as the
   * title of the Open Graph and Twitter Card.
   *
   * @default 'Agicash'
   */
  title?: string;
  /**
   * The description of the page. This will be used as the description of the
   * Open Graph and Twitter Card.
   *
   * @default 'The easiest way to send and receive cash.'
   */
  description?: string;
  /**
   * The image to use for the Open Graph and Twitter Card.
   */
  image?: {
    /**
     * The public path to the image to use for the Open Graph and Twitter Card.
     *
     * @default '/icon-192x192.png'
     */
    path: string;
    /**
     * The width of the image in pixels.
     */
    width: number;
    /**
     * The height of the image in pixels.
     */
    height: number;
    /**
     * The type of the image.
     *
     * @example 'image/png'
     */
    type: string;
  };
};

/**
 * Creates default meta tags for the application with optional overrides.
 * @returns Array of MetaDescriptor objects for React Router which can be returned from a MetaFunction
 * to add to the head of the page.
 */
export function createMeta(options: MetaOptions = {}): MetaDescriptor[] {
  const { origin } = useLocationData();

  const title = options.title ?? defaultTitle;
  const description = options.description ?? defaultDescription;
  const imageUrl = new URL(
    options.image?.path ?? defaultImage,
    origin,
  ).toString();

  return [
    // Basic meta tags
    { title },
    { name: 'description', content: description },
    {
      name: 'keywords',
      content:
        'bitcoin, lightning, cashu, ecash, digital cash, wallet, agicash',
    },

    // Open Graph meta tags
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:alt', content: defaultImageAlt },
    {
      property: 'og:image:width',
      content: options.image?.width ?? defaultImageWidth,
    },
    {
      property: 'og:image:height',
      content: options.image?.height ?? defaultImageHeight,
    },
    {
      property: 'og:image:type',
      content: options.image?.type ?? defaultImageType,
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: origin },
    { property: 'og:site_name', content: defaultOgSiteName },

    // Twitter Card meta tags
    { name: 'twitter:card=', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: defaultImageAlt },
  ];
}
