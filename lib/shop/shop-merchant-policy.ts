/**
 * Public merchant facts shared by product JSON-LD and the customer policy page.
 * Postal transit is an evidence-backed estimate, not a guaranteed arrival date.
 */
export const SHOP_HANDOFF_MAX_BUSINESS_DAYS = 3;

// Post Pishtaz: reported 24–72h service range and 1405 tariff D+3,
// with two additional days for island destinations. Estimate, not SLA.
// Sources: docs/HALLEUS_TOROB_MERCHANT_READINESS_20261119.md.
export const SHOP_POST_TRANSIT_MIN_BUSINESS_DAYS = 1;
export const SHOP_POST_TRANSIT_MAX_BUSINESS_DAYS = 5;

export const SHOP_MERCHANT_CATEGORY = {
  '@type': 'CategoryCode',
  inCodeSet: 'https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt',
  codeValue: '500044', // Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork
} as const;

export const SHOP_CUSTOM_RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'IR',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
} as const;

export const SHOP_HANDOFF_DELIVERY_TIME = {
  '@type': 'ShippingDeliveryTime',
  handlingTime: {
    '@type': 'QuantitativeValue',
    minValue: 0,
    maxValue: SHOP_HANDOFF_MAX_BUSINESS_DAYS,
    unitCode: 'DAY',
  },
  transitTime: {
    '@type': 'QuantitativeValue',
    minValue: SHOP_POST_TRANSIT_MIN_BUSINESS_DAYS,
    maxValue: SHOP_POST_TRANSIT_MAX_BUSINESS_DAYS,
    unitCode: 'DAY',
  },
} as const;

export const SHOP_POLICY_PATH = '/shop/shipping-returns';
