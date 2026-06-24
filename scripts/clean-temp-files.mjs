import { rm } from "node:fs/promises";

const tempFiles = [
  "astro_clean_report_output_v1.ps1",
  "astro_clean_report_layout_safe.js",
  "astro_clean_report_ui_export_safe.js",
  "astro_clean_reports_v2_aggressive_safe.js",
  "astro_clean_form_ux_batch.ps1",
  "astro_clean_product_docs_batch.ps1",
  "apply_report_tools_v1.js",
  "apply_report_layout_safe.js",
  "fix_form_optional_name.js",
  "fix-engine-mojibake.js",
];

let removed = 0;

for (const file of tempFiles) {
  try {
    await rm(file, { force: true });
    removed += 1;
  } catch {
    // ignore
  }
}

console.log(`Temp cleanup complete. Checked ${tempFiles.length} files.`);
