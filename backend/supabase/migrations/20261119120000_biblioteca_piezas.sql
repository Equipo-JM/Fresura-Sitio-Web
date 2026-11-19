-- Biblioteca de piezas guardadas desde el chat del agente (RF-18): guiones,
-- publicaciones, carruseles, prompts, ideas y calendarios. Guardar y aprobar
-- son acciones explícitas de la persona administradora; el agente no escribe aquí.

create table public.biblioteca_piezas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (
    tipo in (
      'guion', 'publicacion', 'carrusel', 'prompt_imagen', 'prompt_clip',
      'prompt_heygen', 'variantes_gancho', 'ideas', 'calendario', 'revision'
    )
  ),
  titulo text not null check (char_length(trim(titulo)) between 1 and 120),
  red text check (red in ('instagram', 'tiktok', 'facebook')),
  -- Pieza completa tal como la validó el panel con los esquemas compartidos.
  contenido jsonb not null,
  estado text not null default 'borrador' check (estado in ('borrador', 'aprobada')),
  conversacion_id uuid references public.agente_conversaciones (id) on delete set null,
  creado_por uuid not null default auth.uid() references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index biblioteca_piezas_por_fecha
on public.biblioteca_piezas (creado_en desc, id desc);

create trigger biblioteca_piezas_actualizar_fecha
before update on public.biblioteca_piezas
for each row execute function public.actualizar_fecha_conversacion();

alter table public.biblioteca_piezas enable row level security;

revoke all on public.biblioteca_piezas from anon, authenticated;
grant select, insert, update, delete on public.biblioteca_piezas to authenticated;
-- BYPASSRLS no sustituye los permisos de tabla (20261116130000, DT-01 sección 20).
grant select, insert, update, delete on public.biblioteca_piezas to service_role;

create policy "Admin gestiona la biblioteca"
on public.biblioteca_piezas for all to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

create policy "Exige segundo paso"
on public.biblioteca_piezas as restrictive for all to authenticated
using (((select auth.jwt()) ->> 'aal') = 'aal2')
with check (((select auth.jwt()) ->> 'aal') = 'aal2');
