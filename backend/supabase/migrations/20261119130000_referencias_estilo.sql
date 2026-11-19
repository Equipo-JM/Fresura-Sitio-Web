-- Referencias de estilo de las redes de Fresura: publicaciones recientes que el
-- agente lee para imitar su tono, sus ganchos y su formato. Hoy se pegan a mano;
-- `origen = 'meta'` queda para la importación futura con la API de Meta.

create table public.referencias_estilo (
  id uuid primary key default gen_random_uuid(),
  red text not null check (red in ('instagram', 'tiktok', 'facebook')),
  formato text not null check (formato in ('video', 'carrusel', 'foto', 'historia')),
  enlace text check (enlace is null or enlace ~ '^https://'),
  -- Texto de la publicación o descripción de lo que se ve y se dice en el video.
  texto text not null check (char_length(trim(texto)) between 1 and 3000),
  publicada_en date,
  origen text not null default 'manual' check (origen in ('manual', 'meta')),
  creado_por uuid not null default auth.uid() references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now()
);

create index referencias_estilo_recientes
on public.referencias_estilo (publicada_en desc nulls last, creado_en desc);

alter table public.referencias_estilo enable row level security;

revoke all on public.referencias_estilo from anon, authenticated;
grant select, insert, update, delete on public.referencias_estilo to authenticated;
-- BYPASSRLS no sustituye los permisos de tabla (20261116130000, DT-01 sección 20).
grant select, insert, update, delete on public.referencias_estilo to service_role;

create policy "Admin gestiona las referencias de estilo"
on public.referencias_estilo for all to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

create policy "Exige segundo paso"
on public.referencias_estilo as restrictive for all to authenticated
using (((select auth.jwt()) ->> 'aal') = 'aal2')
with check (((select auth.jwt()) ->> 'aal') = 'aal2');
