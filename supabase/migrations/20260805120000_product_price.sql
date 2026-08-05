-- Preço do produto pra exibir nos cards ainda não comprados, com quebra opcional de promoção
-- (price = preço cheio; promo_price = preço promocional, exibido como "de/por" quando menor que price).
alter table public.products
  add column if not exists price numeric(10, 2);
alter table public.products
  add column if not exists promo_price numeric(10, 2);

comment on column public.products.price is 'Preço cheio exibido nos cards de produtos ainda não comprados.';
comment on column public.products.promo_price is 'Preço promocional (opcional); exibido como "de/por" quando menor que price.';
