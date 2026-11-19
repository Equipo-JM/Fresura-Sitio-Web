-- Reserva un trabajo por entrega de guion antes de llamar al proveedor.
create table public.agente_videos (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.agente_conversaciones (id) on delete cascade,
  guion_llamada text not null,
  voz text not null check (char_length(btrim(voz)) > 0),
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'enviando', 'enviado', 'rechazado', 'indeterminado')
  ),
  did_id text unique,
  did_recurso text check (did_recurso in ('talks', 'expressives')),
  confirmado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (conversacion_id, guion_llamada),
  check ((estado = 'enviado') = (did_id is not null)),
  check ((did_id is null) = (did_recurso is null))
);

create index agente_videos_conversacion_fecha
on public.agente_videos (conversacion_id, creado_en desc, id desc);

alter table public.agente_videos enable row level security;
revoke all on public.agente_videos from anon, authenticated;
grant select, insert, update on public.agente_videos to service_role;
