-- HALLEUS_BATCH4_R20B_PERMANENT_MIN3_GRAPH_REPAIR
-- HALLEUS_BATCH4_R20_PERMANENT_MIN3_GRAPH_REPAIR
-- Frozen from the accepted R19D1 localhost preview: exactly 29 additive Wiki->Wiki edges.
-- Existing Wiki article-link markers are immutable. This migration only applies if the
-- live current-public graph is still the exact reviewed 101-article pre-repair state.
-- It synchronizes body_markdown + intro + key_points + sections, appends one revision
-- per changed source article, increments content_version once, and refreshes inline
-- rows in public.wiki_internal_links for changed sources.
-- No generic bridge generator exists here; every old/new phrase below is frozen editorial authority.

begin;

do $$
begin
  if to_regclass('public.wiki_articles') is null
    or to_regclass('public.wiki_article_revisions') is null
    or to_regclass('public.wiki_article_drafts') is null
    or to_regclass('public.wiki_internal_links') is null
    or to_regclass('halleus_private.wiki_publish_jobs') is null then
    raise exception 'Wiki storage/CMS migrations must be applied before R20 graph repair.';
  end if;
end;
$$;

create temporary table halleus_r20_plan (
  source_stable_id text not null,
  target_stable_id text not null,
  ordinal integer not null,
  anchor text not null,
  old_text text not null,
  replacement_template text not null,
  repair_kind text not null,
  primary key (source_stable_id, target_stable_id),
  unique (source_stable_id, ordinal)
) on commit drop;

insert into halleus_r20_plan (
  source_stable_id, target_stable_id, ordinal, anchor, old_text, replacement_template, repair_kind
) values
  ('ordibehesht-birth-month-compatibility', 'ordibehesht-born-traits', 1, 'خصوصیات متولدین اردیبهشت', 'خصوصیات متولدین اردیبهشت', '{{LINK}}', 'outgoing-min3'),
  ('ordibehesht-birth-month-compatibility', 'why-sun-sign-is-not-enough', 2, 'چرا فقط ماه تولد شخصیت شما را توضیح نمی‌دهد؟', 'چرا فقط ماه تولد شخصیت شما را توضیح نمی‌دهد؟', '{{LINK}}', 'outgoing-min3'),
  ('ordibehesht-birth-month-compatibility', 'seventh-house-in-natal-chart', 3, 'خانه هفتم در چارت تولد', 'خانه هفتم در چارت تولد', '{{LINK}}', 'outgoing-min3'),
  ('shahrivar-woman-traits', 'shahrivar-born-traits', 1, 'خصوصیات متولدین شهریور', 'خصوصیات متولدین شهریور', '{{LINK}}', 'outgoing-min3'),
  ('shahrivar-woman-traits', 'venus-in-natal-chart', 2, 'ونوس در چارت تولد', 'ونوس در چارت تولد', '{{LINK}}', 'outgoing-min3'),
  ('tir-born-traits', 'persian-birth-months-astrology-guide', 1, 'خصوصیات ۱۲ ماه تولد؛ نماد، عنصر و شخصیت هر ماه', 'خصوصیات ۱۲ ماه تولد؛ نماد، عنصر و شخصیت هر ماه', '{{LINK}}', 'outgoing-min3'),
  ('tir-born-traits', 'what-is-moon-sign', 2, 'نشان ماه چیست', 'نشان ماه چیست', '{{LINK}}', 'outgoing-min3'),
  ('shahrivar-man-traits', 'seventh-house-in-natal-chart', 1, 'خانه هفتم در چارت تولد', 'خانه هفتم در چارت تولد', '{{LINK}}', 'outgoing-min3'),
  ('shahrivar-man-traits', 'mercury-in-natal-chart', 2, 'عطارد در چارت تولد', 'عطارد در چارت تولد', '{{LINK}}', 'outgoing-min3'),
  ('shahrivar-man-traits', 'venus-in-natal-chart', 3, 'ونوس در چارت تولد', 'ونوس در چارت تولد', '{{LINK}}', 'outgoing-min3'),
  ('natal-chart-uses-and-limits', 'active-receptive-energy-in-astrology', 1, 'قطبیت مردانه و زنانه در آسترولوژی', 'تقسیم نمادها به مردانه و زنانه در برخی سنت‌ها یک دسته‌بندی نمادین تاریخی است و نباید به جنسیت واقعی فرد تبدیل شود.', 'تقسیم نمادها بر اساس {{LINK}} در برخی سنت‌ها یک دسته‌بندی نمادین تاریخی است و نباید به جنسیت واقعی فرد تبدیل شود.', 'incoming-curated'),
  ('zodiac-modalities-in-natal-chart', 'active-receptive-energy-in-astrology', 1, 'قطبیت فعال و پذیرنده در آسترولوژی', 'خانه‌های زاویه‌ای، مریخ، خورشید یا جنبه‌های فعال می‌توانند انرژی آغاز را جبران کنند.', 'خانه‌های زاویه‌ای، مریخ، خورشید یا جنبه‌های فعال می‌توانند انرژی آغاز را جبران کنند. این بحثِ آغازگری را نباید با {{LINK}} یکی گرفت؛ کیفیت نشان و قطبیت دو محور جدا هستند.', 'incoming-curated'),
  ('tir-born-traits', 'active-receptive-energy-in-astrology', 3, 'قطبیت فعال و پذیرنده در آسترولوژی', 'یعنی انرژی آغاز، جهت‌دادن و حرکت‌دادن شرایط را هم دارد.', 'یعنی انرژی آغاز، جهت‌دادن و حرکت‌دادن شرایط را هم دارد. در عین حال، سرطان از نظر {{LINK}} در گروه پذیرنده قرار می‌گیرد؛ کاردینال‌بودن و پذیرنده‌بودن دو محور متفاوت‌اند.', 'incoming-curated'),
  ('why-transits-differ-by-person', 'astrology-today-vs-daily-horoscope', 1, 'فال روزانه یا ماهانه در آسترولوژی', 'فال روزانه یا ماهانه معمولاً افراد را بر اساس نشان خورشید یا رایزینگ در دوازده گروه قرار می‌دهد.', '{{LINK}} معمولاً افراد را بر اساس نشان خورشید یا رایزینگ در دوازده گروه قرار می‌دهد.', 'incoming-curated'),
  ('natal-chart-vs-transit-chart', 'astrology-today-vs-daily-horoscope', 1, 'فال روزانه بر اساس نشان خورشیدی', 'چارت ترنزیت شخصی مقایسهٔ آسمان جاری با چارت تولد است.', 'چارت ترنزیت شخصی، برخلاف {{LINK}}، آسمان جاری را با چارت تولد فرد مقایسه می‌کند.', 'incoming-curated'),
  ('what-is-astrology', 'astrology-today-vs-daily-horoscope', 1, 'فال روزانه و آسترولوژی امروز', 'بخش بزرگی از آسترولوژی غربی امروز از زودیاک تروپیکال استفاده می‌کند.', 'بخش بزرگی از آسترولوژی غربی امروز از زودیاک تروپیکال استفاده می‌کند. این کاربردِ «امروز» را نباید با {{LINK}} یکی گرفت؛ اینجا منظور سنت رایج معاصر است.', 'incoming-curated'),
  ('chart-ruler-in-natal-chart', 'birth-chart-report-layers', 1, 'لایه‌های ترکیب گزارش چارت تولد', 'در هالیوس، حاکم چارت یکی از لایه‌های ترکیب گزارش است؛ نه برچسبی که همه‌چیز را خلاصه کند.', 'در هالیوس، حاکم چارت یکی از {{LINK}} است؛ نه برچسبی که همه‌چیز را خلاصه کند.', 'incoming-curated'),
  ('uranus-in-natal-chart', 'birth-chart-report-layers', 1, 'لایه‌های گزارش چارت تولد', 'جایگاه آن فقط یکی از لایه‌های چارت است و باید با بقیهٔ ساختار هماهنگ شود.', 'جایگاه آن فقط یکی از {{LINK}} است و باید با بقیهٔ ساختار هماهنگ شود.', 'incoming-curated'),
  ('birth-chart-basics', 'birth-chart-report-layers', 1, 'چهار لایهٔ اصلی خواندن چارت', 'چهار لایهٔ اصلی خواندن چارت', '{{LINK}}', 'incoming-curated'),
  ('four-elements-in-natal-chart', 'missing-elements-in-natal-chart', 1, 'کمبود یک عنصر در چارت تولد', 'کمبود یک عنصر نقص شخصیت یا ناتوانی همیشگی نیست.', '{{LINK}} به معنی نقص شخصیت یا ناتوانی همیشگی نیست.', 'incoming-curated'),
  ('how-to-read-birth-chart', 'missing-elements-in-natal-chart', 1, 'کمبود عنصر آب در چارت تولد', 'برای مثال، کمبود عنصر آب را نباید سریعاً به بی‌احساسی تعبیر کرد.', 'برای مثال، {{LINK}} را نباید سریعاً به بی‌احساسی تعبیر کرد.', 'incoming-curated'),
  ('stellium-in-natal-chart', 'missing-elements-in-natal-chart', 1, 'عنصر کم‌رنگ‌تر در چارت تولد', 'همچنین خانه‌ها و حاکمان می‌توانند عنصر کم‌رنگ‌تر را وارد زندگی کنند.', 'همچنین خانه‌ها و حاکمان می‌توانند اثر {{LINK}} را در تجربهٔ زندگی پررنگ کنند.', 'incoming-curated'),
  ('ordibehesht-woman-traits', 'ordibehesht-birth-month-compatibility', 1, 'سازگاری و دوام ازدواج متولد اردیبهشت', 'خورشید اردیبهشت به‌تنهایی دربارهٔ دوام ازدواج تصمیم نمی‌گیرد.', '{{LINK}} را هم نمی‌شود فقط از خورشید نتیجه گرفت.', 'incoming-curated'),
  ('shahrivar-birth-month-compatibility', 'shahrivar-woman-traits', 1, 'زن متولد شهریور', 'ازدواج دو متولد شهریور؛ نظم مشترک و خطر انتقاد زیاد — دو شهریوری معمولاً نیاز هم به نظم، مسئولیت و کیفیت را سریع می‌فهمند.', 'ازدواج دو متولد شهریور؛ نظم مشترک و خطر انتقاد زیاد — در رابطهٔ یک {{LINK}} با مرد متولد شهریور، نیاز مشترک به نظم، مسئولیت و کیفیت معمولاً زودتر به چشم می‌آید.', 'incoming-curated'),
  ('khordad-born-traits', 'tir-born-traits', 1, 'احساس خانواده و حساسیت متولدین تیر', 'متولد نخستین یا آخرین ساعات خرداد ممکن است بسته به سال، ساعت و شهر تولد خورشید ثور، جوزا یا سرطان داشته باشد.', 'متولد نخستین یا آخرین ساعات خرداد ممکن است بسته به سال، ساعت و شهر تولد خورشید ثور، جوزا یا سرطان داشته باشد. اگر محاسبه نشان دهد خورشید وارد سرطان شده، {{LINK}} به توصیف نشان نزدیک‌تر است تا برچسب تقویمی خرداد.', 'incoming-curated'),
  ('shahrivar-birth-month-compatibility', 'shahrivar-man-traits', 2, 'مرد متولد شهریور', 'ازدواج دو متولد شهریور؛ نظم مشترک و خطر انتقاد زیاد — در رابطهٔ یک [[article:shahrivar-woman-traits|زن متولد شهریور]] با مرد متولد شهریور، نیاز مشترک به نظم، مسئولیت و کیفیت معمولاً زودتر به چشم می‌آید.', 'ازدواج دو متولد شهریور؛ نظم مشترک و خطر انتقاد زیاد — در رابطهٔ یک [[article:shahrivar-woman-traits|زن متولد شهریور]] با {{LINK}}، نیاز مشترک به نظم، مسئولیت و کیفیت معمولاً زودتر به چشم می‌آید.', 'incoming-curated'),
  ('mordad-1405-transit-guide', 'shahrivar-1405-transit-guide', 1, 'ترنزیت‌های مهم شهریور ۱۴۰۵', 'برای روشن‌ترشدن زمینهٔ این بحث، ترنزیت چیست؟ را هم ببین.', 'در {{LINK}} همین مرز میان آسمان عمومی و خوانش شخصی برای رویدادهای ماه بعد ادامه پیدا می‌کند.', 'incoming-curated'),
  ('important-transits-tir-1405', 'shahrivar-1405-transit-guide', 1, 'ترنزیت‌های مهم شهریور ۱۴۰۵', 'برای روشن‌ترشدن زمینهٔ این بحث، چارت تولد چیست؟ را هم ببین.', '{{LINK}} همین روش ماهانه را روی رویدادهای شهریور ادامه می‌دهد تا تفاوت نقشهٔ عمومی آسمان با خوانش شخصی روشن بماند.', 'incoming-curated'),
  ('fast-vs-slow-astrology-transits', 'shahrivar-1405-transit-guide', 1, 'ترنزیت‌های مهم شهریور ۱۴۰۵', 'برای دیدن نمونه‌ای از لایه‌بندی سیاره‌های سریع و کند در یک بازهٔ واقعی، ترنزیت‌های مهم تیر ۱۴۰۵ وضعیت عمومی تیر ۱۴۰۵ را بدون تبدیل آن به حکم شخصی مرور می‌کند.', 'برای دیدن این لایه‌بندی در بازه‌های واقعی، ترنزیت‌های مهم تیر ۱۴۰۵ وضعیت عمومی تیر را مرور می‌کند و {{LINK}} همان روش را روی ماه بعد ادامه می‌دهد؛ بدون اینکه متن ماهانه به حکم شخصی تبدیل شود.', 'incoming-curated');

do $$
declare
  repair_count integer;
  source_count integer;
begin
  select count(*)::integer, count(distinct source_stable_id)::integer
    into repair_count, source_count
  from halleus_r20_plan;

  if repair_count <> 29 then
    raise exception 'R20 frozen repair plan must contain exactly 29 unique source-target edges; found %.', repair_count;
  end if;
  if source_count <> 21 then
    raise exception 'R20 frozen repair plan must mutate exactly 21 source articles; found %.', source_count;
  end if;
  if exists (select 1 from halleus_r20_plan where source_stable_id = target_stable_id) then
    raise exception 'R20 frozen repair plan contains a self-link.';
  end if;
  if exists (
    select 1 from halleus_r20_plan
    where (char_length(replacement_template) - char_length(replace(replacement_template, '{{LINK}}', '')))
          / char_length('{{LINK}}') <> 1
  ) then
    raise exception 'R20 every frozen template must contain exactly one {{LINK}} placeholder.';
  end if;
end;
$$;

create temporary table halleus_r20_public_before on commit drop as
select article.*
from public.wiki_articles as article
where article.status = 'published'
  and article.is_indexable = true
  and article.published_at is not null
  and article.published_at <= now()
  and article.scheduled_for is null
  and article.deleted_at is null;

create unique index halleus_r20_public_before_stable_idx
  on halleus_r20_public_before(stable_id);

do $$
declare
  public_count integer;
  outgoing_state jsonb;
  incoming_state jsonb;
begin
  select count(*)::integer into public_count from halleus_r20_public_before;
  if public_count <> 101 then
    raise exception 'R20 reviewed live graph expected 101 current-public articles; found %.', public_count;
  end if;

  with valid_pairs as (
    select distinct source.stable_id as source_id, target.stable_id as target_id
    from halleus_r20_public_before as source
    cross join lateral regexp_matches(
      coalesce(source.body_markdown, ''),
      '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
      'g'
    ) edge(parts)
    join halleus_r20_public_before as target
      on target.stable_id = (edge.parts)[1]
     and target.stable_id <> source.stable_id
  ), outgoing as (
    select source.stable_id, count(valid.target_id)::integer as count
    from halleus_r20_public_before source
    left join valid_pairs valid on valid.source_id = source.stable_id
    group by source.stable_id
  )
  select coalesce(jsonb_agg(jsonb_build_array(stable_id, count) order by stable_id), '[]'::jsonb)
    into outgoing_state
  from outgoing
  where count < 3;

  with valid_pairs as (
    select distinct source.stable_id as source_id, target.stable_id as target_id
    from halleus_r20_public_before as source
    cross join lateral regexp_matches(
      coalesce(source.body_markdown, ''),
      '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
      'g'
    ) edge(parts)
    join halleus_r20_public_before as target
      on target.stable_id = (edge.parts)[1]
     and target.stable_id <> source.stable_id
  ), incoming as (
    select target.stable_id, count(valid.source_id)::integer as count
    from halleus_r20_public_before target
    left join valid_pairs valid on valid.target_id = target.stable_id
    group by target.stable_id
  )
  select coalesce(jsonb_agg(jsonb_build_array(stable_id, count) order by stable_id), '[]'::jsonb)
    into incoming_state
  from incoming
  where count < 3;

  if outgoing_state <> '[["ordibehesht-birth-month-compatibility",0],["shahrivar-man-traits",0],["shahrivar-woman-traits",1],["tir-born-traits",0]]'::jsonb then
    raise exception 'R20 outgoing reviewed pre-state changed: %', outgoing_state;
  end if;
  if incoming_state <> '[["active-receptive-energy-in-astrology",0],["astrology-today-vs-daily-horoscope",0],["birth-chart-report-layers",0],["missing-elements-in-natal-chart",0],["ordibehesht-birth-month-compatibility",2],["shahrivar-1405-transit-guide",0],["shahrivar-man-traits",2],["shahrivar-woman-traits",2],["tir-born-traits",2]]'::jsonb then
    raise exception 'R20 incoming reviewed pre-state changed: %', incoming_state;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from halleus_r20_plan plan
    left join halleus_r20_public_before target on target.stable_id = plan.target_stable_id
    where target.stable_id is null
  ) then
    raise exception 'R20 target set contains a non-current-public article.';
  end if;

  if exists (
    select 1
    from halleus_r20_plan plan
    join halleus_r20_public_before source on source.stable_id = plan.source_stable_id
    cross join lateral regexp_matches(
      coalesce(source.body_markdown, ''),
      '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
      'g'
    ) edge(parts)
    where (edge.parts)[1] = plan.target_stable_id
  ) then
    raise exception 'R20 frozen repair contains a source-target pair that already exists in the live body.';
  end if;

  if exists (
    select 1
    from public.wiki_article_drafts draft
    join public.wiki_articles article on article.id = draft.article_id
    where article.stable_id in (select distinct source_stable_id from halleus_r20_plan)
      and article.deleted_at is null
  ) then
    raise exception 'R20 source article has an active draft; resolve it before applying permanent repair.';
  end if;

  if exists (
    select 1
    from halleus_private.wiki_publish_jobs job
    join public.wiki_articles article on article.id = job.article_id
    where article.stable_id in (select distinct source_stable_id from halleus_r20_plan)
      and article.deleted_at is null
      and job.status in ('queued','running','retry','failed')
  ) then
    raise exception 'R20 source article has an active publish job; resolve it before applying permanent repair.';
  end if;
end;
$$;

create temporary table halleus_r20_existing_markers_before on commit drop as
select
  source.stable_id as source_stable_id,
  edge.ordinality::integer as occurrence_ordinal,
  (edge.parts)[1] as full_marker
from halleus_r20_public_before source
cross join lateral regexp_matches(
  coalesce(source.body_markdown, ''),
  '(\[\[article:[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\|[^\]\r\n]+)?\]\])',
  'g'
) with ordinality edge(parts, ordinality);

create or replace function pg_temp.halleus_r20_count_occurrences(haystack text, needle text)
returns integer language plpgsql immutable as $$
declare source text := coalesce(haystack, '');
begin
  if needle is null or needle = '' then return 0; end if;
  return (char_length(source) - char_length(replace(source, needle, ''))) / char_length(needle);
end;
$$;

create or replace function pg_temp.halleus_r20_marker(target_id text, anchor_value text)
returns text language sql immutable as $$
  select '[[article:' || target_id || '|' || anchor_value || ']]';
$$;

create or replace function pg_temp.halleus_r20_replacement(template_value text, target_id text, anchor_value text)
returns text language sql immutable as $$
  select replace(template_value, '{{LINK}}', pg_temp.halleus_r20_marker(target_id, anchor_value));
$$;

create or replace function pg_temp.halleus_r20_apply_text(payload text, source_id text)
returns text language plpgsql as $$
declare
  result text := coalesce(payload, '');
  item record;
  replacement text;
  count_before integer;
begin
  for item in
    select * from halleus_r20_plan
    where source_stable_id = source_id
    order by ordinal
  loop
    count_before := pg_temp.halleus_r20_count_occurrences(result, item.old_text);
    if count_before = 1 then
      replacement := pg_temp.halleus_r20_replacement(
        item.replacement_template, item.target_stable_id, item.anchor
      );
      result := replace(result, item.old_text, replacement);
    elsif count_before > 1 then
      raise exception 'R20 ambiguous text occurrence for % -> %: %',
        item.source_stable_id, item.target_stable_id, count_before;
    end if;
  end loop;
  return result;
end;
$$;

create or replace function pg_temp.halleus_r20_apply_text_array(payload jsonb, source_id text)
returns jsonb language plpgsql as $$
declare
  result jsonb := '[]'::jsonb;
  item jsonb;
begin
  if jsonb_typeof(payload) <> 'array' then return payload; end if;
  for item in select value from jsonb_array_elements(payload)
  loop
    if jsonb_typeof(item) = 'string' then
      result := result || jsonb_build_array(
        to_jsonb(pg_temp.halleus_r20_apply_text(item #>> '{}', source_id))
      );
    else
      result := result || jsonb_build_array(item);
    end if;
  end loop;
  return result;
end;
$$;

create or replace function pg_temp.halleus_r20_apply_sections(payload jsonb, source_id text)
returns jsonb language plpgsql as $$
declare
  result jsonb := '[]'::jsonb;
  section_item jsonb;
  section_result jsonb;
begin
  if jsonb_typeof(payload) <> 'array' then return payload; end if;
  for section_item in select value from jsonb_array_elements(payload)
  loop
    section_result := section_item;
    if jsonb_typeof(section_item -> 'paragraphs') = 'array' then
      section_result := jsonb_set(
        section_result, '{paragraphs}',
        pg_temp.halleus_r20_apply_text_array(section_item -> 'paragraphs', source_id), false
      );
    end if;
    if jsonb_typeof(section_item -> 'bullets') = 'array' then
      section_result := jsonb_set(
        section_result, '{bullets}',
        pg_temp.halleus_r20_apply_text_array(section_item -> 'bullets', source_id), false
      );
    end if;
    result := result || jsonb_build_array(section_result);
  end loop;
  return result;
end;
$$;

create temporary table halleus_r20_target_rows on commit drop as
select
  article.*,
  pg_temp.halleus_r20_apply_text(article.body_markdown, article.stable_id) as corrected_body_markdown,
  pg_temp.halleus_r20_apply_text(article.intro, article.stable_id) as corrected_intro,
  pg_temp.halleus_r20_apply_text_array(article.key_points, article.stable_id) as corrected_key_points,
  pg_temp.halleus_r20_apply_sections(article.sections, article.stable_id) as corrected_sections,
  article.content_version + 1 as corrected_version
from public.wiki_articles article
where article.stable_id in (select distinct source_stable_id from halleus_r20_plan)
  and article.status = 'published'
  and article.is_indexable = true
  and article.published_at is not null
  and article.published_at <= now()
  and article.scheduled_for is null
  and article.deleted_at is null;

do $$
declare
  item record;
  body_count integer;
  visible_count integer;
begin
  if (select count(*) from halleus_r20_target_rows) <> 21 then
    raise exception 'R20 target-row count must be 21.';
  end if;

  for item in select * from halleus_r20_plan order by source_stable_id, ordinal
  loop
    select pg_temp.halleus_r20_count_occurrences(
      target.corrected_body_markdown,
      pg_temp.halleus_r20_marker(item.target_stable_id, item.anchor)
    )
    into body_count
    from halleus_r20_target_rows target
    where target.stable_id = item.source_stable_id;

    select
      pg_temp.halleus_r20_count_occurrences(target.corrected_intro, pg_temp.halleus_r20_marker(item.target_stable_id, item.anchor))
      + coalesce((
          select sum(pg_temp.halleus_r20_count_occurrences(value #>> '{}', pg_temp.halleus_r20_marker(item.target_stable_id, item.anchor)))
          from jsonb_array_elements(target.corrected_key_points) value
          where jsonb_typeof(value) = 'string'
        ), 0)
      + coalesce((
          select sum(pg_temp.halleus_r20_count_occurrences(value #>> '{}', pg_temp.halleus_r20_marker(item.target_stable_id, item.anchor)))
          from jsonb_array_elements(target.corrected_sections) section_item
          cross join lateral jsonb_array_elements(
            coalesce(section_item -> 'paragraphs', '[]'::jsonb)
            || coalesce(section_item -> 'bullets', '[]'::jsonb)
          ) value
          where jsonb_typeof(value) = 'string'
        ), 0)
    into visible_count
    from halleus_r20_target_rows target
    where target.stable_id = item.source_stable_id;

    if body_count <> 1 then
      raise exception 'R20 corrected body marker count mismatch for % -> %: %',
        item.source_stable_id, item.target_stable_id, body_count;
    end if;
    if visible_count <> 1 then
      raise exception 'R20 corrected visible marker count mismatch for % -> %: %',
        item.source_stable_id, item.target_stable_id, visible_count;
    end if;
  end loop;
end;
$$;

lock table public.wiki_articles in share row exclusive mode;
lock table public.wiki_article_revisions in share row exclusive mode;
lock table public.wiki_internal_links in share row exclusive mode;

with inserted_revisions as (
  insert into public.wiki_article_revisions (
    article_id, revision_number, snapshot, change_note, created_by,
    revision_status, published_at
  )
  select
    target.id,
    (select coalesce(max(existing.revision_number),0)::integer + 1
     from public.wiki_article_revisions existing
     where existing.article_id = target.id),
    jsonb_build_object(
      'stableId', target.stable_id,
      'slug', target.slug,
      'title', target.title,
      'shortTitle', target.short_title,
      'seoTitle', target.seo_title,
      'metaDescription', coalesce(target.meta_description, target.summary),
      'categoryId', target.category_id,
      'tags', target.tags,
      'summary', target.summary,
      'intro', target.corrected_intro,
      'readingMinutes', target.reading_minutes,
      'publicationPriority', target.publication_priority,
      'contentCluster', coalesce(target.content_cluster, target.category_id),
      'articleRole', target.article_role,
      'relatedArticleIds', target.related_article_ids,
      'indexable', target.is_indexable,
      'bodyMarkdown', target.corrected_body_markdown,
      'keyPoints', target.corrected_key_points,
      'sections', target.corrected_sections,
      'contextLinks', coalesce(target.context_links, '[]'::jsonb),
      'sources', coalesce(target.sources, '[]'::jsonb),
      'callToAction', target.call_to_action,
      'contentVersion', target.corrected_version
    ),
    'Batch 4 R20B permanent additive contextual min3 repair; frozen R19D1 authority plus live101 delta',
    null,
    'published',
    now()
  from halleus_r20_target_rows target
  returning article_id
)
update public.wiki_articles article
set
  body_markdown = target.corrected_body_markdown,
  intro = target.corrected_intro,
  key_points = target.corrected_key_points,
  sections = target.corrected_sections,
  content_version = target.corrected_version
from halleus_r20_target_rows target
where article.id = target.id
  and exists (select 1 from inserted_revisions revision where revision.article_id = article.id);

delete from public.wiki_internal_links link
using public.wiki_articles article
where link.source_article_id = article.id
  and link.link_kind = 'inline'
  and article.stable_id in (select distinct source_stable_id from halleus_r20_plan);

insert into public.wiki_internal_links (
  source_article_id, target_stable_id, link_kind, source_token
)
select distinct
  article.id,
  (edge.parts)[1],
  'inline',
  '[[article:' || (edge.parts)[1] || ']]'
from public.wiki_articles article
cross join lateral regexp_matches(
  coalesce(article.body_markdown, ''),
  '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
  'g'
) edge(parts)
where article.stable_id in (select distinct source_stable_id from halleus_r20_plan);

do $$
declare
  removed_existing text[];
  version_mismatch text[];
  outgoing_violations text[];
  incoming_violations text[];
begin
  with before_counts as (
    select source_stable_id, full_marker, count(*)::integer as count
    from halleus_r20_existing_markers_before
    group by source_stable_id, full_marker
  ), after_counts as (
    select
      article.stable_id as source_stable_id,
      (edge.parts)[1] as full_marker,
      count(*)::integer as count
    from public.wiki_articles article
    join halleus_r20_public_before before on before.id = article.id
    cross join lateral regexp_matches(
      coalesce(article.body_markdown, ''),
      '(\[\[article:[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\|[^\]\r\n]+)?\]\])',
      'g'
    ) edge(parts)
    group by article.stable_id, (edge.parts)[1]
  )
  select array_agg(
    before.source_stable_id || ':' || before.full_marker ||
    ':before=' || before.count || ':after=' || coalesce(after.count,0)
    order by before.source_stable_id, before.full_marker
  )
  into removed_existing
  from before_counts before
  left join after_counts after
    on after.source_stable_id = before.source_stable_id
   and after.full_marker = before.full_marker
  where coalesce(after.count,0) < before.count;

  if coalesce(array_length(removed_existing,1),0) <> 0 then
    raise exception 'R20 additive-only invariant failed; existing marker removed/changed: %', removed_existing;
  end if;

  select array_agg(
    before.stable_id || ':before=' || before.content_version || ':after=' || article.content_version
    order by before.stable_id
  )
  into version_mismatch
  from halleus_r20_public_before before
  join public.wiki_articles article on article.id = before.id
  where (
    before.stable_id in (select distinct source_stable_id from halleus_r20_plan)
    and article.content_version <> before.content_version + 1
  ) or (
    before.stable_id not in (select distinct source_stable_id from halleus_r20_plan)
    and article.content_version <> before.content_version
  );

  if coalesce(array_length(version_mismatch,1),0) <> 0 then
    raise exception 'R20 content_version scope mismatch: %', version_mismatch;
  end if;

  with current_public as (
    select stable_id, body_markdown
    from public.wiki_articles
    where status='published' and is_indexable=true
      and published_at is not null and published_at <= now()
      and scheduled_for is null and deleted_at is null
  ), valid_pairs as (
    select distinct source.stable_id source_id, target.stable_id target_id
    from current_public source
    cross join lateral regexp_matches(
      coalesce(source.body_markdown,''),
      '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
      'g'
    ) edge(parts)
    join current_public target
      on target.stable_id=(edge.parts)[1] and target.stable_id<>source.stable_id
  ), outgoing as (
    select source.stable_id, count(valid.target_id)::integer count
    from current_public source left join valid_pairs valid on valid.source_id=source.stable_id
    group by source.stable_id
  ), incoming as (
    select target.stable_id, count(valid.source_id)::integer count
    from current_public target left join valid_pairs valid on valid.target_id=target.stable_id
    group by target.stable_id
  )
  select array_agg(stable_id || ':' || count order by stable_id)
    into outgoing_violations
  from outgoing where count < 3;

  with current_public as (
    select stable_id, body_markdown
    from public.wiki_articles
    where status='published' and is_indexable=true
      and published_at is not null and published_at <= now()
      and scheduled_for is null and deleted_at is null
  ), valid_pairs as (
    select distinct source.stable_id source_id, target.stable_id target_id
    from current_public source
    cross join lateral regexp_matches(
      coalesce(source.body_markdown,''),
      '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
      'g'
    ) edge(parts)
    join current_public target
      on target.stable_id=(edge.parts)[1] and target.stable_id<>source.stable_id
  ), incoming as (
    select target.stable_id, count(valid.source_id)::integer count
    from current_public target left join valid_pairs valid on valid.target_id=target.stable_id
    group by target.stable_id
  )
  select array_agg(stable_id || ':' || count order by stable_id)
    into incoming_violations
  from incoming where count < 3;

  if coalesce(array_length(outgoing_violations,1),0) <> 0 then
    raise exception 'GLOBAL_PUBLIC_OUTGOING_MIN3 failed after R20: %', outgoing_violations;
  end if;
  if coalesce(array_length(incoming_violations,1),0) <> 0 then
    raise exception 'GLOBAL_PUBLIC_INCOMING_MIN3 failed after R20: %', incoming_violations;
  end if;

  if exists (
    with body_pairs as (
      select distinct article.id source_article_id, (edge.parts)[1] target_stable_id
      from public.wiki_articles article
      cross join lateral regexp_matches(
        coalesce(article.body_markdown,''),
        '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
        'g'
      ) edge(parts)
      where article.stable_id in (select distinct source_stable_id from halleus_r20_plan)
    ), table_pairs as (
      select distinct link.source_article_id, link.target_stable_id
      from public.wiki_internal_links link
      join public.wiki_articles article on article.id=link.source_article_id
      where link.link_kind='inline'
        and article.stable_id in (select distinct source_stable_id from halleus_r20_plan)
    )
    (select * from body_pairs except select * from table_pairs)
    union all
    (select * from table_pairs except select * from body_pairs)
  ) then
    raise exception 'R20 public.wiki_internal_links inline materialization does not match changed article bodies.';
  end if;
end;
$$;

commit;

select 'HALLEUS_BATCH4_R20B_PERMANENT_MIN3_GRAPH_REPAIR=SUCCESS' as marker;
