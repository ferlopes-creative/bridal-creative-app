-- Deixa o admin escolher se a capa do produto é cortada (cover) ou mostrada inteira (contain)

alter table public.products
  add column if not exists image_fit text;

comment on column public.products.image_fit is
  '"cover" (padrão, corta pra preencher o quadrado) ou "contain" (mostra a imagem inteira, sem cortar).';
