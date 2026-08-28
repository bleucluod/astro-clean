alter table halleus_private.wiki_link_scan_triggers
  drop constraint if exists wiki_link_scan_triggers_trigger_kind_check;

alter table halleus_private.wiki_link_scan_triggers
  add constraint wiki_link_scan_triggers_trigger_kind_check
  check (trigger_kind in ('manual_full','manual_article','post_publish','periodic'));
