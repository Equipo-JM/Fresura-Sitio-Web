-- Base de datos inicial de Fresura (DT-01, secciones 3, 4, 19, 20 y 21).
-- Tablas: versiones_contenido, guiones y prompts_video; bucket de fotos.
-- "Admin" = sesión con app_metadata.rol = 'admin' y nivel aal2 (segundo paso completado).

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.estado_contenido as enum ('borrador', 'publicada', 'anterior');
create type public.estado_guion as enum ('borrador', 'aprobado', 'descartado');

-- ---------------------------------------------------------------------------
-- Comprobación de administrador
-- ---------------------------------------------------------------------------

-- El rol se lee de app_metadata porque el usuario no puede modificarlo; el rol
-- `authenticated` lo tiene cualquier sesión y no basta (DT-01, sección 6).
create function public.es_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'rol', '') = 'admin'
     and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- versiones_contenido
-- ---------------------------------------------------------------------------

create table public.versiones_contenido (
  id uuid primary key default gen_random_uuid(),
  estado public.estado_contenido not null,
  version_contrato text not null,
  json jsonb not null,
  publicada_en timestamptz,
  revision integer not null default 1 check (revision >= 1),
  creada_por uuid not null default auth.uid() references auth.users (id),
  publicada_por uuid references auth.users (id),
  actualizada_en timestamptz not null default now(),
  nota text check (char_length(nota) <= 200),
  -- Un borrador nunca lleva datos de publicación; una versión publicada o anterior siempre tiene fecha.
  constraint datos_de_publicacion check (
    (estado = 'borrador' and publicada_en is null and publicada_por is null)
    or (estado <> 'borrador' and publicada_en is not null)
  )
);

-- Como máximo un borrador, una publicada y una anterior.
create unique index versiones_contenido_un_estado on public.versiones_contenido (estado);

-- DD-03: el panel guarda con `.eq('revision', leida)`; la base sube la revisión
-- para que una segunda escritura con la revisión vieja no encuentre la fila.
create function public.subir_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  new.actualizada_en := now();
  return new;
end;
$$;

create trigger versiones_contenido_subir_revision
before update on public.versiones_contenido
for each row execute function public.subir_revision();

alter table public.versiones_contenido enable row level security;

-- Se retiran los permisos por defecto y se otorgan solo los necesarios (DT-01, sección 20).
revoke all on public.versiones_contenido from anon, authenticated;
-- anon solo ve las columnas públicas: el sitio debe pedirlas por nombre, no con `select('*')`.
grant select (id, estado, version_contrato, json, publicada_en) on public.versiones_contenido to anon;
grant select, insert, update, delete on public.versiones_contenido to authenticated;

create policy "Visitante lee la versión publicada"
on public.versiones_contenido for select to anon
using (estado = 'publicada');

create policy "Admin lee todas las versiones"
on public.versiones_contenido for select to authenticated
using ((select public.es_admin()));

-- El admin solo toca el borrador; publicar y restaurar pasan por la función `panel` (DD-02).
create policy "Admin crea el borrador"
on public.versiones_contenido for insert to authenticated
with check ((select public.es_admin()) and estado = 'borrador');

create policy "Admin cambia el borrador"
on public.versiones_contenido for update to authenticated
using ((select public.es_admin()) and estado = 'borrador')
with check ((select public.es_admin()) and estado = 'borrador');

create policy "Admin descarta el borrador"
on public.versiones_contenido for delete to authenticated
using ((select public.es_admin()) and estado = 'borrador');

-- Política restrictiva: sin segundo paso no hay acceso, aunque otra política lo permita.
create policy "Exige segundo paso"
on public.versiones_contenido as restrictive for all to authenticated
using (((select auth.jwt()) ->> 'aal') = 'aal2')
with check (((select auth.jwt()) ->> 'aal') = 'aal2');

-- ---------------------------------------------------------------------------
-- Publicar y restaurar (DD-02): una transacción cada una, solo service_role
-- ---------------------------------------------------------------------------

-- La función `panel` valida el JSON con Zod y las reglas RC antes de llamarla.
-- `revision_esperada` garantiza que se publica exactamente el borrador validado.
create function public.publicar_borrador(revision_esperada integer, usuario uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  borrador_id uuid;
begin
  select id into borrador_id
  from public.versiones_contenido
  where estado = 'borrador' and revision = revision_esperada
  for update;

  if borrador_id is null then
    raise exception 'conflicto_borrador' using errcode = 'P0001',
      hint = 'No hay borrador o cambió desde que se leyó.';
  end if;

  -- El orden respeta el índice único por estado.
  delete from public.versiones_contenido where estado = 'anterior';
  update public.versiones_contenido set estado = 'anterior' where estado = 'publicada';
  update public.versiones_contenido
  set estado = 'publicada', publicada_en = now(), publicada_por = usuario
  where id = borrador_id;

  return borrador_id;
end;
$$;

-- Intercambia el contenido de la publicada y la anterior sin tocar `estado`
-- (DT-01, sección 21.1), así que restaurar también se puede deshacer.
create function public.restaurar_anterior()
returns void
language plpgsql
set search_path = ''
as $$
declare
  publicada public.versiones_contenido%rowtype;
  anterior public.versiones_contenido%rowtype;
begin
  select * into publicada from public.versiones_contenido where estado = 'publicada' for update;
  select * into anterior from public.versiones_contenido where estado = 'anterior' for update;

  if anterior.id is null or publicada.id is null then
    raise exception 'sin_anterior' using errcode = 'P0001',
      hint = 'No hay versión anterior para restaurar.';
  end if;

  update public.versiones_contenido
  set json = anterior.json, version_contrato = anterior.version_contrato,
      publicada_en = anterior.publicada_en, publicada_por = anterior.publicada_por
  where id = publicada.id;

  update public.versiones_contenido
  set json = publicada.json, version_contrato = publicada.version_contrato,
      publicada_en = publicada.publicada_en, publicada_por = publicada.publicada_por
  where id = anterior.id;
end;
$$;

revoke execute on function public.publicar_borrador(integer, uuid) from public, anon, authenticated;
revoke execute on function public.restaurar_anterior() from public, anon, authenticated;
grant execute on function public.publicar_borrador(integer, uuid) to service_role;
grant execute on function public.restaurar_anterior() to service_role;

-- ---------------------------------------------------------------------------
-- guiones y prompts_video
-- ---------------------------------------------------------------------------

create table public.guiones (
  id uuid primary key default gen_random_uuid(),
  instruccion jsonb not null,
  generado jsonb not null,
  editado jsonb not null,
  estado public.estado_guion not null default 'borrador',
  creado_por uuid not null default auth.uid() references auth.users (id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.prompts_video (
  id uuid primary key default gen_random_uuid(),
  -- Un solo prompt por guion; regenerar lo reemplaza (DD-17).
  guion_id uuid not null unique references public.guiones (id) on delete cascade,
  contenido jsonb not null,
  creado_en timestamptz not null default now()
);

-- DD-27: las transiciones de la sección 21.2 las garantiza la base, aunque falle el cliente.
create function public.controlar_guion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'borrador' then
      raise exception 'Un guion nuevo se guarda como borrador.' using errcode = 'P0001';
    end if;
    new.editado := coalesce(new.editado, new.generado);
    return new;
  end if;

  if new.generado is distinct from old.generado then
    raise exception 'El texto generado no se puede cambiar.' using errcode = 'P0001';
  end if;

  if new.estado <> old.estado and not (
    (old.estado = 'borrador' and new.estado in ('aprobado', 'descartado'))
    or (old.estado = 'aprobado' and new.estado in ('borrador', 'descartado'))
    or (old.estado = 'descartado' and new.estado = 'borrador')
  ) then
    raise exception 'Cambio de estado no permitido: % a %.', old.estado, new.estado
      using errcode = 'P0001';
  end if;

  -- Editar un guion aprobado lo devuelve a borrador; uno descartado no se edita.
  if new.editado is distinct from old.editado and new.estado <> 'borrador' then
    raise exception 'Solo se edita un guion en borrador.' using errcode = 'P0001';
  end if;

  new.actualizado_en := now();
  return new;
end;
$$;

create trigger guiones_controlar
before insert or update on public.guiones
for each row execute function public.controlar_guion();

-- Al salir de Aprobado, el prompt de video deja de valer y se borra.
create function public.borrar_prompt_al_salir_de_aprobado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado = 'aprobado' and new.estado <> 'aprobado' then
    delete from public.prompts_video where guion_id = new.id;
  end if;
  return new;
end;
$$;

create trigger guiones_borrar_prompt
after update on public.guiones
for each row execute function public.borrar_prompt_al_salir_de_aprobado();

-- El prompt solo se crea o cambia con el guion aprobado (RF-17).
create function public.exigir_guion_aprobado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.guiones where id = new.guion_id and estado = 'aprobado'
  ) then
    raise exception 'El prompt de video solo se genera desde un guion aprobado.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger prompts_video_exigir_aprobado
before insert or update on public.prompts_video
for each row execute function public.exigir_guion_aprobado();

alter table public.guiones enable row level security;
alter table public.prompts_video enable row level security;

revoke all on public.guiones, public.prompts_video from anon, authenticated;
grant select, insert, update, delete on public.guiones, public.prompts_video to authenticated;

create policy "Admin gestiona los guiones"
on public.guiones for all to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

create policy "Exige segundo paso"
on public.guiones as restrictive for all to authenticated
using (((select auth.jwt()) ->> 'aal') = 'aal2')
with check (((select auth.jwt()) ->> 'aal') = 'aal2');

create policy "Admin gestiona los prompts de video"
on public.prompts_video for all to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

create policy "Exige segundo paso"
on public.prompts_video as restrictive for all to authenticated
using (((select auth.jwt()) ->> 'aal') = 'aal2')
with check (((select auth.jwt()) ->> 'aal') = 'aal2');

-- ---------------------------------------------------------------------------
-- Storage: bucket de fotos (DT-01, sección 19.1)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 307200, array['image/webp', 'image/jpeg']);

-- Lectura pública por URL (bucket público). Subir: solo admin y con nombre
-- `<sha256>.webp` o `.jpg`, para que una foto nunca sobrescriba otra.
-- Sin políticas de cambio ni borrado: el borrado lo hace `panel` con service_role.
create policy "Admin sube fotos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fotos'
  and (select public.es_admin())
  and name ~ '^[0-9a-f]{64}\.(webp|jpg)$'
);
