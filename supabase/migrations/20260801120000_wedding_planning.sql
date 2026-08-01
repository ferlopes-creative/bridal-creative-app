-- Módulo de Planejamento de Casamento: detalhes do casamento, fornecedores,
-- checklist e convidados, um conjunto de linhas por usuária (auth.uid()).
-- Acesso Premium reaproveita o mecanismo existente de purchases/products
-- (mesmo webhook Cakto/Hotmart que já libera a Comunidade), via a coluna
-- products.is_wedding_planning_premium.

-- 1) Detalhes gerais do casamento (1 registro por usuária)
create table if not exists public.wedding_details (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bride_name text,
  groom_name text,
  wedding_date date,
  budget_total numeric(12, 2) not null default 0,
  vows text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wedding_details enable row level security;

drop policy if exists "wedding_details_select_own" on public.wedding_details;
drop policy if exists "wedding_details_insert_own" on public.wedding_details;
drop policy if exists "wedding_details_update_own" on public.wedding_details;

create policy "wedding_details_select_own"
  on public.wedding_details for select
  to authenticated
  using (user_id = auth.uid());

create policy "wedding_details_insert_own"
  on public.wedding_details for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "wedding_details_update_own"
  on public.wedding_details for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.wedding_details to authenticated;


-- 2) Fornecedores
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text, -- ex: 'Buffet', 'Fotografia', 'Decoração' (uso Premium: gráfico por área)
  contact text,
  contracted_value numeric(12, 2) not null default 0,
  paid_value numeric(12, 2) not null default 0,
  closing_date date,
  final_payment_date date,
  payment_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

drop policy if exists "vendors_all_own" on public.vendors;

create policy "vendors_all_own"
  on public.vendors for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.vendors to authenticated;

create index if not exists vendors_user_id_idx on public.vendors (user_id);


-- 3) Checklist (itens padrão semeados na 1ª entrada + itens custom, Premium)
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phase text not null, -- ex: '12 meses antes', '6 meses antes'
  title text not null,
  done boolean not null default false,
  is_custom boolean not null default false, -- true = criado pela usuária (Premium)
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.checklist_items enable row level security;

drop policy if exists "checklist_items_all_own" on public.checklist_items;

create policy "checklist_items_all_own"
  on public.checklist_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.checklist_items to authenticated;

create index if not exists checklist_items_user_id_idx on public.checklist_items (user_id);


-- 4) Convidados (Premium)
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  side text, -- 'Noiva', 'Noivo', 'Ambos'
  status text not null default 'pendente', -- 'confirmado', 'pendente', 'nao'
  created_at timestamptz not null default now()
);

alter table public.guests enable row level security;

drop policy if exists "guests_all_own" on public.guests;

create policy "guests_all_own"
  on public.guests for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.guests to authenticated;

create index if not exists guests_user_id_idx on public.guests (user_id);


-- 5) Semeia o checklist padrão (14 tarefas, mesmas fases do dashboard aprovado)
-- quando a usuária entra na seção pela primeira vez.
create or replace function public.seed_default_wedding_checklist(p_user_id uuid)
returns void as $$
begin
  if exists (select 1 from public.checklist_items where user_id = p_user_id) then
    return;
  end if;

  insert into public.checklist_items (user_id, phase, title, is_custom, sort_order)
  values
    (p_user_id, '12 meses antes', 'Definir orçamento total', false, 0),
    (p_user_id, '12 meses antes', 'Fechar local da cerimônia e festa', false, 1),
    (p_user_id, '12 meses antes', 'Definir número aproximado de convidados', false, 2),
    (p_user_id, '10 meses antes', 'Contratar buffet', false, 3),
    (p_user_id, '10 meses antes', 'Contratar fotógrafo e videomaker', false, 4),
    (p_user_id, '10 meses antes', 'Pesquisar assessoria/cerimonial', false, 5),
    (p_user_id, '9 meses antes', 'Escolher identidade visual e papelaria', false, 6),
    (p_user_id, '9 meses antes', 'Criar site do casamento', false, 7),
    (p_user_id, '8 meses antes', 'Contratar decoração', false, 8),
    (p_user_id, '8 meses antes', 'Definir cardápio com o buffet', false, 9),
    (p_user_id, '7 meses antes', 'Provar e escolher vestido', false, 10),
    (p_user_id, '7 meses antes', 'Escolher trajes dos padrinhos', false, 11),
    (p_user_id, '6 meses antes', 'Enviar save the date', false, 12),
    (p_user_id, '6 meses antes', 'Contratar música/banda/DJ', false, 13),
    (p_user_id, '6 meses antes', 'Contratar doces e bolo', false, 14),
    (p_user_id, '5 meses antes', 'Fechar lista de convidados', false, 15),
    (p_user_id, '5 meses antes', 'Escolher alianças', false, 16),
    (p_user_id, '3 meses antes', 'Enviar convites', false, 17),
    (p_user_id, '3 meses antes', 'Agendar exames pré-nupciais', false, 18),
    (p_user_id, '3 meses antes', 'Marcar horário de cabelo e maquiagem', false, 19),
    (p_user_id, '1 mês antes', 'Prova final do vestido', false, 20),
    (p_user_id, '1 mês antes', 'Confirmar contratos e pagamentos finais', false, 21),
    (p_user_id, '2 semanas antes', 'Confirmar fornecedores e horários', false, 22),
    (p_user_id, '2 semanas antes', 'Fazer prova de cabelo e maquiagem', false, 23),
    (p_user_id, '1 semana antes', 'Repassar cronograma do dia com todos', false, 24),
    (p_user_id, '1 semana antes', 'Preparar kit de emergência', false, 25)
  on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.seed_default_wedding_checklist(uuid) to authenticated;


-- 6) Marca qual produto (já cadastrado em products) libera o Premium do
-- Planejamento quando comprado — reaproveita purchases + o webhook
-- Cakto/Hotmart existente, sem tabela nem Edge Function novas.
alter table public.products
  add column if not exists is_wedding_planning_premium boolean not null default false;

create unique index if not exists products_wedding_planning_premium_unique_idx
  on public.products (is_wedding_planning_premium)
  where is_wedding_planning_premium;

comment on column public.products.is_wedding_planning_premium is
  'true no máximo em 1 produto: é ele que, comprado (purchases.status = active), libera o Premium do Planejamento de Casamento.';
