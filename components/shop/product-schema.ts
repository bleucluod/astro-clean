import { SHOP_SIZES, type ShopProduct } from './product-detail-data';

/** Data displayed on the preview PDP; do not advertise offers until checkout is live. */
export function buildShopProductStructuredData(product: ShopProduct, siteUrl: string) {
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}/shop/${product.id}`;
  const breadcrumbId = `${url}#breadcrumb`;
  const productId = `${url}#product`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'هالیوس', item: base },
          { '@type': 'ListItem', position: 2, name: 'فروشگاه', item: `${base}/shop` },
          { '@type': 'ListItem', position: 3, name: product.title, item: url },
        ],
      },
      {
        '@type': 'Product',
        '@id': productId,
        productID: product.id,
        name: product.title,
        description: product.introduction,
        image: product.gallery.map(({ src }) => new URL(src, base).toString()),
        url,
        brand: { '@type': 'Brand', name: 'هالیوس' },
        category: 'تابلوی شخصی‌سازی‌شده',
        material: 'چاپ مات روی شاسی بدون قاب',
        size: SHOP_SIZES.map(({ label }) => `${label} سانتی‌متر`),
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: product.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: product.title,
        inLanguage: 'fa-IR',
        breadcrumb: { '@id': breadcrumbId },
        mainEntity: { '@id': productId },
      },
    ],
  };
}
