import { rm } from "node:fs/promises";

const tempFiles = [
  "halleus_auth_readiness_migration_v1.js",
  "halleus_database_readiness_foundation_v1.js",
  "halleus_profile_dashboard_account_readiness_v1.js",
  "halleus_account_db_foundation_v1.js",
  "halleus_storage_ui_completion_v1.js",
  "halleus_repository_backed_reports_v1.js",
  "halleus_storage_adapter_impl_v1_fixed.js",
  "halleus_storage_adapter_impl_v1.js",
  "halleus_storage_foundation_v1.js",
  "halleus_full_iran_cities_foundation_v1.js",
  "astro_clean_homepage_visual_polish_v1.js",
  "halleus_homepage_brand_scale_v1.js",
  "halleus_product_foundation_v1.js",
  "astro_clean_locations_v1_continue.js",
  "astro_clean_report_output_v1.ps1",
  "astro_clean_report_layout_safe.js",
  "astro_clean_report_ui_export_safe.js",
  "astro_clean_reports_v2_aggressive_safe.js",
  "astro_clean_locations_v1.js",
  "astro_clean_form_ux_batch.ps1",
  "astro_clean_product_docs_batch.ps1",
  "apply_report_tools_v1.js",
  "apply_report_layout_safe.js",
  "fix_form_optional_name.js",
  "fix-engine-mojibake.js",
];


for (const file of tempFiles) {
  try {
    await rm(file, { force: true });
  } catch {
    // ignore
  }
}

console.log(`Temp cleanup complete. Checked ${tempFiles.length} files.`);
