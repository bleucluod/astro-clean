-- OPTIONAL second-stage preflight; read-only, isolated cloned database only.
-- Run this only after the first inventory proves that
-- public.halleus_reports.display_number exists and has type BIGINT.
-- Otherwise this file will fail, and must NOT be forced or rewritten to
-- extract private report JSON or guess the schema.

begin transaction isolation level repeatable read read only;

select count(*) filter (where display_number is null) as missing_numbers,
  count(*) filter (where display_number <= 0) as nonpositive_numbers,
  max(display_number) as max_existing_report_number
from public.halleus_reports;

select count(*) as duplicated_report_numbers from (
  select display_number
  from public.halleus_reports
  where display_number is not null
  group by display_number having count(*) > 1
) as duplicates;

-- If a private shop_orders table already exists, a separate reviewed query
-- must also check its maximum and duplicates before any re-migration.

rollback;
