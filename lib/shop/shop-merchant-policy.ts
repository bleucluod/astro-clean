/**
 * Public merchant facts shared by product JSON-LD and the customer policy page.
 * Do not infer carrier transit time or promise delivery to the customer's door.
 */
export const SHOP_HANDOFF_MAX_BUSINESS_DAYS = 3;

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
  // Transit time depends on the carrier/destination and is not yet verified.
} as const;

export const SHOP_POLICY_PATH = '/shop/shipping-returns';
