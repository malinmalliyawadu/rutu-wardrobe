-- A plan slot she added or wrote herself was source 'malin', from the app this
-- one started from. It is 'own' now: hers, kept through a redraft.

alter table blueprint_slots drop constraint blueprint_slots_source_check;
update blueprint_slots set source = 'own' where source = 'malin';
alter table blueprint_slots add constraint blueprint_slots_source_check check (source in ('claude', 'own'));
