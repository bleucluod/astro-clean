export function notifyHalleusDataChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("halleus-data-changed"));
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}
