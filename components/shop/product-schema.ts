import { SHOP_SIZES, SHOP_P02_SIZES, type ShopProduct } from './product-detail-data';
import { SHOP_SHIPPING_AND_PACKAGING } from './shop-checkout-state';
import { getShopProductUrl } from '@/lib/shop/shop-product-url';
import type { ShopPriceMap } from '@/lib/shop/shop-price-store';
import {
  SHOP_CUSTOM_RETURN_POLICY, SHOP_HANDOFF_DELIVERY_TIME,
  SHOP_MERCHANT_CATEGORY, SHOP_POLICY_PATH,
} from '@/lib/shop/shop-merchant-policy';

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
  nemadMonth?: string,
) {
  const base = siteUrl.replace(/\/$/, '');
  if (product.id === 'nm' && !nemadMonth) throw new Error('Nemad listing needs a month slug');
  const url = `${base}${getShopProductUrl(product.id, nemadMonth)}`;
  const breadcrumbId = `${url}#breadcrumb`;
  const productId = `${url}#product`;
  const sizes = product.id === 'p02' ? SHOP_P02_SIZES : SHOP_SIZES;
  // All three live product pages initially select 10x15.
  const defaultSize = sizes[0];
  const priceToman = prices ? prices[product.id + ':' + defaultSize.dimension] : defaultSize.price;
  if (product.id !== 'p03' && (!Number.isSafeInteger(priceToman) || priceToman < 1000)) {
    throw new Error('Merchant Offer price is not present in the authoritative catalog');
  }

  // No synthetic ratings. Returns are restricted for personalized artwork.
  // Tipax has a separate pay-on-delivery
  // transport charge, so only the known fixed Post+packaging option is marked up.
  const offer = product.id === 'p03' ? null : {
    '@type': 'Offer',
    url,
    price: priceToman * 10,
    priceCurrency: 'IRR',
    availability: purchasable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': `${base}/#organization` },
    hasMerchantReturnPolicy: {
      ...SHOP_CUSTOM_RETURN_POLICY,
      url: `${base}${SHOP_POLICY_PATH}`,
    },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: SHOP_SHIPPING_AND_PACKAGING.post * 10,
        currency: 'IRR',
      },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IR' },
      deliveryTime: SHOP_HANDOFF_DELIVERY_TIME,
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
        productID: product.id === 'nm' ? 'nm-' + nemadMonth : product.id,
        name: product.title,
        description: product.introduction,
        // The first two Nemad entries are live-theme selectors, not product photos.
        image: (product.id === 'nm' ? product.gallery.slice(2) : product.gallery)
          .map(({ src }) => new URL(src, base).toString()),
        url,
        brand: { '@type': 'Brand', name: 'هالیوس' },
        category: SHOP_MERCHANT_CATEGORY,
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
