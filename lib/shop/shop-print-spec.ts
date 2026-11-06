import { SHOP_SIZES, type ShopProductId } from '@/components/shop/product-detail-data';

export const SHOP_PRINT_TARGET_PPI = 300;

export type ShopPrintSpec = {
  sizeCm: string;
  widthCm: number;
  heightCm: number;
  targetPpi: number;
  finalFormat: 'JPEG';
  safeAreaMm: 5;
  minimumSafeInsetPixels: number;
  minimumNativePixels: { width: number; height: number };
  colorMode: 'RGB';
  preferredProfile: 'sRGB';
  substrate: 'matte-print-on-unframed-shasi';
};

export function getShopPrintSpec(size: string): ShopPrintSpec {
  if (!SHOP_SIZES.some((option) => option.dimension === size)) {
    throw new Error('Unknown physical shop print size.');
  }
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) throw new Error('Invalid physical shop print dimensions.');
  const widthCm = Number(match[1]);
  const heightCm = Number(match[2]);
  return {
    sizeCm: size, widthCm, heightCm,
    targetPpi: SHOP_PRINT_TARGET_PPI,
    finalFormat: 'JPEG',
    safeAreaMm: 5,
    minimumSafeInsetPixels: Math.ceil(0.5 / 2.54 * SHOP_PRINT_TARGET_PPI),
    minimumNativePixels: {
      width: Math.ceil(widthCm / 2.54 * SHOP_PRINT_TARGET_PPI),
      height: Math.ceil(heightCm / 2.54 * SHOP_PRINT_TARGET_PPI),
    },
    colorMode: 'RGB', preferredProfile: 'sRGB',
    substrate: 'matte-print-on-unframed-shasi',
  };
}

export type RasterPrepressInput = {
  productId: ShopProductId;
  size: string;
  width: number;
  height: number;
  channels?: number;
  space?: string;
  isApprovedFinalMaster: boolean;
};

export function checkShopRasterPrepress(input: RasterPrepressInput) {
  const spec = getShopPrintSpec(input.size);
  const issues: string[] = [];
  if (!Number.isSafeInteger(input.width) || input.width <= 0 ||
      !Number.isSafeInteger(input.height) || input.height <= 0) {
    issues.push('invalid-native-raster-dimensions');
  } else {
    if (input.width < spec.minimumNativePixels.width || input.height < spec.minimumNativePixels.height) {
      issues.push('insufficient-native-resolution');
    }
    const actualRatio = input.width / input.height;
    const targetRatio = spec.widthCm / spec.heightCm;
    if (Math.abs(actualRatio - targetRatio) > 0.01) issues.push('aspect-ratio-mismatch');
  }
  if (input.channels !== 3 || (input.space !== 'srgb' && input.space !== 'rgb')) {
    issues.push('rgb-color-validation-required');
  }
  if (!input.isApprovedFinalMaster) issues.push('artwork-not-approved');
  return { productId: input.productId, spec, readyToPrint: issues.length === 0, issues };
}
