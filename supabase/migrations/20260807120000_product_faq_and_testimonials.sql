-- FAQ e depoimentos próprios de cada produto (independentes dos depoimentos globais da Início)

alter table public.products
  add column if not exists faq_config jsonb not null default '[]'::jsonb;
alter table public.products
  add column if not exists product_testimonials_config jsonb not null default '[]'::jsonb;

comment on column public.products.faq_config is 'Array JSON: perguntas/respostas exibidas como accordion na página do produto.';
comment on column public.products.product_testimonials_config is 'Array JSON: depoimentos exclusivos deste produto (mesmo formato de site_settings.testimonials_config).';
