-- Descrições separadas: compra (antes do acesso) e entrega (após a compra)

alter table public.products
  add column if not exists description_delivery text;

comment on column public.products.description is 'Descrição exibida antes da compra (visitante / sem acesso).';
comment on column public.products.description_delivery is 'Descrição exibida após a compra (cliente com acesso).';

update public.products
set description_delivery = description
where description_delivery is null
  and description is not null
  and trim(description) <> '';
