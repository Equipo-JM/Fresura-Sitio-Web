-- Memoria del agente (DT-01, 19.1 y 25.6; NT-08, 4.3).
-- Se conserva hasta que el administrador borre la conversación (DT-01, 25.3).
-- No se guardan datos personales; el chat debe advertirlo (NT-08, 4.3).

create table public.agente_conversaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 1 and 120),
  creado_por uuid not null default auth.uid() references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.agente_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.agente_conversaciones (id) on delete cascade,
  rol text not null check (rol in ('administrador', 'agente', 'herramienta')),
  contenido jsonb not null,
  creado_en timestamptz not null default now()
);

create index agente_mensajes_por_conversacion_fecha
on public.agente_mensajes (conversacion_id, creado_en);

-- Las funciones existentes incluyen reglas de guiones o versiones que aquí no aplican.
create function public.actualizar_fecha_conversacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger agente_conversaciones_actualizar_fecha
before update on public.agente_conversaciones
for each row execute function public.actualizar_fecha_conversacion();

-- Insertar un mensaje también cuenta como actividad de la conversación.
create function public.actualizar_conversacion_al_insertar_mensaje()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.agente_conversaciones
  set actualizado_en = now()
  where id = new.conversacion_id;
  return new;
end;
$$;

create trigger agente_mensajes_actualizar_conversacion
after insert on public.agente_mensajes
for each row execute function public.actualizar_conversacion_al_insertar_mensaje();

-- Como en la revocación de rls_auto_enable, los disparadores no necesitan EXECUTE público.
revoke execute on function public.actualizar_fecha_conversacion() from public, anon, authenticated;
revoke execute on function public.actualizar_conversacion_al_insertar_mensaje() from public, anon, authenticated;

alter table public.agente_conversaciones enable row level security;
alter table public.agente_mensajes enable row level security;

revoke all on public.agente_conversaciones, public.agente_mensajes from anon, authenticated;
grant select, insert, update, delete on public.agente_conversaciones, public.agente_mensajes to authenticated;
-- BYPASSRLS no sustituye los permisos de tabla (20261116130000, DT-01 sección 20).
grant select, insert, update, delete on public.agente_conversaciones, public.agente_mensajes to service_role;

create policy "Admin gestiona las conversaciones"
on public.agente_conversaciones for all to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

create policy "Exige segundo paso"
on public.agente_conversaciones as restrictive for all to authenticated
using (((select auth.jwt()) ->> 'aal') = 'aal2')
with check (((select auth.jwt()) ->> 'aal') = 'aal2');

create policy "Admin gestiona los mensajes"
on public.agente_mensajes for all to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

create policy "Exige segundo paso"
on public.agente_mensajes as restrictive for all to authenticated
using (((select auth.jwt()) ->> 'aal') = 'aal2')
with check (((select auth.jwt()) ->> 'aal') = 'aal2');
