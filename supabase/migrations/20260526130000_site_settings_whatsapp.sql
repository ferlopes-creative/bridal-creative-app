-- Link do WhatsApp (botão flutuante e CTA do dashboard)

alter table public.site_settings
  add column if not exists whatsapp_url text;

comment on column public.site_settings.whatsapp_url is 'Link wa.me ou número; usado no botão flutuante e no CTA personalizado do dashboard.';
