-- Rutu's wardrobe starts from Malin's, and this turns it into womenswear.
--
-- Garments: dresses, jumpsuits, skirts, tops, flats, heels, sandals and
-- jewellery are their own types; polos and overshirts are gone (a polo is a
-- top or a tee, an overshirt a shirt or a jacket); 'shoes' is now 'flats'.
-- Rows typed the old way move across so nothing breaks a constraint.
--
-- Products say whether they are womenswear, and a store's catalogue is
-- 'womenswear' or 'mixed'.
--
-- Proportions: build reads slim, athletic, curvy or full, and the read adds
-- how defined her waist is, which most of a womenswear silhouette turns on.
--
-- Rodd & Gunn was a menswear store read from its own pages; it is not one of
-- hers, so its platform goes.

update blueprint_slots set garment_type = case garment_type
  when 'polo' then 'top' when 'overshirt' then 'shirt' when 'shoes' then 'flats' else garment_type end;
update products set garment_type = case garment_type
  when 'polo' then 'top' when 'overshirt' then 'shirt' when 'shoes' then 'flats' else garment_type end;
update wardrobe_pieces set garment_type = case garment_type
  when 'polo' then 'top' when 'overshirt' then 'shirt' when 'shoes' then 'flats' else garment_type end;

alter table blueprint_slots drop constraint blueprint_slots_garment_type_check;
alter table blueprint_slots add constraint blueprint_slots_garment_type_check check (garment_type in (
  'tee', 'tank', 'top', 'shirt', 'knitwear', 'sweatshirt', 'dress', 'jumpsuit', 'skirt',
  'trousers', 'jeans', 'shorts', 'tailoring', 'jacket', 'coat', 'activewear',
  'flats', 'heels', 'sandals', 'boots', 'sneakers', 'belt', 'bag', 'jewellery', 'accessory'));

alter table products drop constraint products_garment_type_check;
alter table products add constraint products_garment_type_check check (garment_type in (
  'tee', 'tank', 'top', 'shirt', 'knitwear', 'sweatshirt', 'dress', 'jumpsuit', 'skirt',
  'trousers', 'jeans', 'shorts', 'tailoring', 'jacket', 'coat', 'activewear',
  'flats', 'heels', 'sandals', 'boots', 'sneakers', 'belt', 'bag', 'jewellery', 'accessory'));

alter table wardrobe_pieces drop constraint wardrobe_pieces_garment_type_check;
alter table wardrobe_pieces add constraint wardrobe_pieces_garment_type_check check (garment_type in (
  'tee', 'tank', 'top', 'shirt', 'knitwear', 'sweatshirt', 'dress', 'jumpsuit', 'skirt',
  'trousers', 'jeans', 'shorts', 'tailoring', 'jacket', 'coat', 'activewear',
  'flats', 'heels', 'sandals', 'boots', 'sneakers', 'belt', 'bag', 'jewellery', 'accessory'));

-- Every product is reclassified at the next ingest; until then none counts.
alter table products rename column menswear to womenswear;
update products set womenswear = null;
drop index if exists products_open_garment;
create index products_open_garment on products (garment_type)
  where removed_at is null and womenswear;

alter table retailers drop constraint retailers_catalogue_check;
update retailers set catalogue = 'mixed';
alter table retailers add constraint retailers_catalogue_check check (catalogue in ('womenswear', 'mixed'));

delete from retailers where platform = 'rodd-and-gunn';
alter table retailers drop constraint retailers_platform_check;
alter table retailers add constraint retailers_platform_check
  check (platform in ('shopify', 'uniqlo', 'manual'));

alter table profile drop constraint profile_build_check;
update profile set build = null where build = 'broad';
alter table profile add constraint profile_build_check check (build in ('slim', 'athletic', 'curvy', 'full'));
alter table profile add column waist_definition text
  check (waist_definition in ('defined', 'moderate', 'straight'));
