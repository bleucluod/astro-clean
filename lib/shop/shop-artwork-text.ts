import { ShopPrintHandoffError } from './shop-print-handoff';

/** Preserve plain customer text while rejecting invalid XML and bidi overrides. */
export function safeShopArtworkText(value: string, label: string, maxLength = 60): string {
  if (value.length > maxLength ||
      /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\ufeff\ufffe\uffff]/u.test(value) ||
      Array.from(value).some((character) => {
        const point = character.codePointAt(0)!;
        return point >= 0xd800 && point <= 0xdfff;
      })) {
    throw new ShopPrintHandoffError(`${label} برای نمایش روی طرح معتبر نیست.`, 422);
  }
  return value.trim();
}

export function xmlShopArtworkText(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}
