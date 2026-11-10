import { SHOP_SIZES, SHOP_P02_SIZES, type ShopProduct } from './product-detail-data';
import { SHOP_SHIPPING_AND_PACKAGING } from './shop-checkout-state';
import { getShopProductUrl } from '@/lib/shop/shop-product-url';
import type { ShopPriceMap } from '@/lib/shop/shop-price-store';

/**
 * Google Product/Merchant Listing markup mirrors the initially selected size.
 * The three sizes are selectable on the page, but currently have no stable
 * size-prefilled URLs, so we do not invent ProductGroup variant URLs.
 * Prices in application state are tomans; ISO 4217 IRR is ten rials per toman.
 * Indexability is controlled by page metadata, not checkout availability.
 */
export function buildShopProductStructuredData(
  product: ShopProduct,
  siteUrl: string,
  purchasable = product.id === 'p01',
  prices?: ShopPriceMap,
) {
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}${getShopProductUrl(product.id)}`;
  const breadcrumbId = `${url}#breadcrumb`;
  const productId = `${url}#product`;
  const sizes = product.id === 'p02' ? SHOP_P02_SIZES : SHOP_SIZES;
  // Defaults must match ProductDetail (P01 index 1) and BirthSkyLiveProduct (P02 index 2).
  const defaultSize = sizes[product.id === 'p02' ? 2 : 1];

  // No synthetic ratings or returns. Tipax has a separate pay-on-delivery
  // transport charge, so only the known fixed Post+packaging option is marked up.
  const offer = product.id === 'p03' ? null : {
    '@type': 'Offer',
    url,
    price: (prices?.[product.id + ':' + defaultSize.dimension] ?? defaultSize.price) * 10,
    priceCurrency: 'IRR',
    availability: purchasable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': `${base}/#organization` },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: SHOP_SHIPPING_AND_PACKAGING.post * 10,
        currency: 'IRR',
      },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IR' },
    },
  };

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
        material: 'چاپ مات روی شاسی',
        size: sizes.map(({ label }) => `${label} سانتی‌متر`),
        ...(offer ? { offers: offer } : {}),
      },
      // These questions are visibly displayed in P01; do not emit P02's
      // registry FAQ unless that same FAQ is actually rendered in its page.
      ...(product.id === 'p01' ? [{
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: product.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }] : []),
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
