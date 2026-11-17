-- Pruebas PU-01 a PU-06, PU-08, PU-15 y memoria del agente (DT-01, secciones 20, 21, 25.6 y 27.1) contra la base real.
-- Simula cada sesión con su rol y sus claims de JWT, como hace PostgREST, sin crear usuarios.
-- Todo ocurre en una transacción que nunca se confirma: no deja datos.
-- Ejecutar: npm run supabase -- db query --linked -f pruebas/rls/permisos.sql
-- (la ruta es relativa a `backend/`, la carpeta de trabajo de la CLI).
-- Cada fila compara lo esperado con lo obtenido; la columna `pasa` debe ser true en todas.

begin;

create temp table resultado (
  orden serial,
  caso text,
  esperado text,
  obtenido text,
  pasa boolean generated always as (esperado = obtenido) stored
);

-- Ejecuta `sentencia` con el rol y los claims indicados y anota cuántas filas afectó o qué error dio.
create function pg_temp.probar(caso text, esperado text, rol text, claims jsonb, sentencia text)
returns void
language plpgsql
as $$
declare
  filas integer;
  obtenido text;
begin
  perform set_config('request.jwt.claims', claims::text, true);
  execute format('set local role %I', rol);
  begin
    execute sentencia;
    get diagnostics filas = row_count;
    obtenido := 'filas=' || filas;
  exception when others then
    obtenido := 'error ' || sqlstate;
  end;
  reset role;
  insert into resultado (caso, esperado, obtenido) values (caso, esperado, obtenido);
end;
$$;

do $$
declare
  admin uuid := (select id from auth.users where raw_app_meta_data ->> 'rol' = 'admin' order by created_at limit 1);
  anonimo jsonb := '{"role":"anon"}';
  sin_rol jsonb := jsonb_build_object('role', 'authenticated', 'aal', 'aal2', 'sub', gen_random_uuid());
  admin_aal1 jsonb := jsonb_build_object('role', 'authenticated', 'aal', 'aal1', 'sub', admin, 'app_metadata', '{"rol":"admin"}'::jsonb);
  admin_aal2 jsonb := jsonb_build_object('role', 'authenticated', 'aal', 'aal2', 'sub', admin, 'app_metadata', '{"rol":"admin"}'::jsonb);
  conversacion uuid := gen_random_uuid();
  mensaje uuid := gen_random_uuid();
  crear_conversacion text;
  crear_mensaje text;
  crear_borrador text := $q$insert into public.versiones_contenido (estado, version_contrato, json) values ('borrador', '1.0.1', '{}')$q$;
begin
  if admin is null then
    raise exception 'No hay cuenta de administrador en este proyecto';
  end if;
  if (select count(*) from public.versiones_contenido where estado = 'publicada') <> 1 then
    raise exception 'Se espera exactamente una versión publicada';
  end if;
  if exists (select 1 from public.versiones_contenido where estado = 'borrador') then
    raise exception 'Hay un borrador real: estas pruebas crean uno propio';
  end if;

  -- PU-01 y PU-06: sin sesión solo lee las columnas públicas de la publicada.
  perform pg_temp.probar('PU-01 anon lee versiones', 'filas=1', 'anon', anonimo, 'select id, estado, json from public.versiones_contenido');
  perform pg_temp.probar('PU-06 anon pide nota', 'error 42501', 'anon', anonimo, 'select nota from public.versiones_contenido');
  perform pg_temp.probar('PU-06 anon pide creada_por', 'error 42501', 'anon', anonimo, 'select creada_por from public.versiones_contenido');
  perform pg_temp.probar('PU-01 anon lee guiones', 'error 42501', 'anon', anonimo, 'select id from public.guiones');
  perform pg_temp.probar('PU-01 anon lee prompts', 'error 42501', 'anon', anonimo, 'select id from public.prompts_video');
  perform pg_temp.probar('PU-01 anon crea borrador', 'error 42501', 'anon', anonimo, crear_borrador);
  perform pg_temp.probar('PU-01 anon publica', 'error 42501', 'anon', anonimo, format('select public.publicar_borrador(1, %L)', admin));

  -- PU-02: con sesión sin rol no ve ni toca nada, ni puede darse el rol.
  perform pg_temp.probar('PU-02 sin rol lee versiones', 'filas=0', 'authenticated', sin_rol, 'select id from public.versiones_contenido');
  perform pg_temp.probar('PU-02 sin rol crea borrador', 'error 42501', 'authenticated', sin_rol, crear_borrador);
  perform pg_temp.probar('PU-02 sin rol lee guiones', 'filas=0', 'authenticated', sin_rol, 'select id from public.guiones');
  perform pg_temp.probar('PU-02 sin rol se da el rol', 'error 42501', 'authenticated', sin_rol, $q$update auth.users set raw_app_meta_data = '{"rol":"admin"}' where id = auth.uid()$q$);

  -- PU-03: admin sin segundo paso queda fuera por la política restrictiva.
  perform pg_temp.probar('PU-03 admin aal1 lee versiones', 'filas=0', 'authenticated', admin_aal1, 'select id from public.versiones_contenido');
  perform pg_temp.probar('PU-03 admin aal1 crea borrador', 'error 42501', 'authenticated', admin_aal1, crear_borrador);
  perform pg_temp.probar('PU-03 admin aal1 lee guiones', 'filas=0', 'authenticated', admin_aal1, 'select id from public.guiones');

  -- PU-04 y PU-05: admin con segundo paso gestiona el borrador, pero no la publicada ni las funciones de DD-02.
  perform pg_temp.probar('PU-04 admin aal2 lee versiones', 'filas=1', 'authenticated', admin_aal2, 'select id, nota, creada_por from public.versiones_contenido');
  perform pg_temp.probar('PU-04 admin aal2 crea borrador', 'filas=1', 'authenticated', admin_aal2, crear_borrador);
  perform pg_temp.probar('PU-04 admin aal2 cambia borrador', 'filas=1', 'authenticated', admin_aal2, $q$update public.versiones_contenido set nota = 'prueba' where estado = 'borrador'$q$);
  perform pg_temp.probar('PU-05 admin cambia estado del borrador', 'error 42501', 'authenticated', admin_aal2, $q$update public.versiones_contenido set estado = 'publicada' where estado = 'borrador'$q$);
  perform pg_temp.probar('PU-05 admin cambia la publicada', 'filas=0', 'authenticated', admin_aal2, $q$update public.versiones_contenido set nota = 'prueba' where estado = 'publicada'$q$);
  perform pg_temp.probar('PU-05 admin borra la publicada', 'filas=0', 'authenticated', admin_aal2, $q$delete from public.versiones_contenido where estado = 'publicada'$q$);
  perform pg_temp.probar('PU-05 admin crea otra publicada', 'error 42501', 'authenticated', admin_aal2, $q$insert into public.versiones_contenido (estado, version_contrato, json, publicada_en) values ('publicada', '1.0.1', '{}', now())$q$);
  perform pg_temp.probar('PU-05 admin ejecuta publicar_borrador', 'error 42501', 'authenticated', admin_aal2, format('select public.publicar_borrador(1, %L)', admin));
  perform pg_temp.probar('PU-05 admin ejecuta restaurar_anterior', 'error 42501', 'authenticated', admin_aal2, 'select public.restaurar_anterior()');
  perform pg_temp.probar('PU-04 admin aal2 descarta borrador', 'filas=1', 'authenticated', admin_aal2, $q$delete from public.versiones_contenido where estado = 'borrador'$q$);

  -- PU-15: la base hace cumplir la máquina de estados del guion (sección 21.2, DD-27).
  perform pg_temp.probar('PU-15 guion nuevo aprobado', 'error P0001', 'authenticated', admin_aal2, $q$insert into public.guiones (instruccion, generado, editado, estado) values ('{"prueba":"pu15"}', '{}', '{}', 'aprobado')$q$);
  perform pg_temp.probar('PU-15 guion nuevo en borrador', 'filas=1', 'authenticated', admin_aal2, $q$insert into public.guiones (instruccion, generado, editado) values ('{"prueba":"pu15"}', '{"v":1}', '{"v":1}')$q$);
  perform pg_temp.probar('PU-15 cambiar generado', 'error P0001', 'authenticated', admin_aal2, $q$update public.guiones set generado = '{"v":2}' where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 prompt sin aprobar', 'error P0001', 'authenticated', admin_aal2, $q$insert into public.prompts_video (guion_id, contenido) select id, '{}' from public.guiones where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 aprobar', 'filas=1', 'authenticated', admin_aal2, $q$update public.guiones set estado = 'aprobado' where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 prompt con aprobado', 'filas=1', 'authenticated', admin_aal2, $q$insert into public.prompts_video (guion_id, contenido) select id, '{}' from public.guiones where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 editar aprobado sin volver a borrador', 'error P0001', 'authenticated', admin_aal2, $q$update public.guiones set editado = '{"v":3}' where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 descartar aprobado', 'filas=1', 'authenticated', admin_aal2, $q$update public.guiones set estado = 'descartado' where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 salir de aprobado borra el prompt', 'filas=0', 'authenticated', admin_aal2, $q$select p.id from public.prompts_video p join public.guiones g on g.id = p.guion_id where g.instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 descartado a aprobado', 'error P0001', 'authenticated', admin_aal2, $q$update public.guiones set estado = 'aprobado' where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 recuperar descartado', 'filas=1', 'authenticated', admin_aal2, $q$update public.guiones set estado = 'borrador' where instruccion ->> 'prueba' = 'pu15'$q$);
  perform pg_temp.probar('PU-15 eliminar guion', 'filas=1', 'authenticated', admin_aal2, $q$delete from public.guiones where instruccion ->> 'prueba' = 'pu15'$q$);

  -- Memoria: mismos claims y comprobaciones de filas/SQLSTATE que guiones.
  -- now() es constante en esta transacción: la fecha inicial se atrasa para probar el disparador.
  crear_conversacion := format($q$insert into public.agente_conversaciones (id, titulo, actualizado_en) values (%L, 'Prueba de memoria', now() - interval '1 day')$q$, conversacion);
  crear_mensaje := format($q$insert into public.agente_mensajes (id, conversacion_id, rol, contenido) values (%L, %L, 'administrador', '{}')$q$, mensaje, conversacion);
  perform pg_temp.probar('Memoria admin aal2 crea conversación', 'filas=1', 'authenticated', admin_aal2, crear_conversacion);
  perform pg_temp.probar('Memoria admin aal2 inserta mensaje', 'filas=1', 'authenticated', admin_aal2, crear_mensaje);
  perform pg_temp.probar('Memoria anon lee conversación', 'error 42501', 'anon', anonimo, format('select id from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria anon crea conversación', 'error 42501', 'anon', anonimo, crear_conversacion);
  perform pg_temp.probar('Memoria anon cambia conversación', 'error 42501', 'anon', anonimo, format($q$update public.agente_conversaciones set titulo = 'Cambio prohibido' where id = %L$q$, conversacion));
  perform pg_temp.probar('Memoria anon borra conversación', 'error 42501', 'anon', anonimo, format('delete from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria anon lee mensaje', 'error 42501', 'anon', anonimo, format('select id from public.agente_mensajes where id = %L', mensaje));
  perform pg_temp.probar('Memoria anon crea mensaje', 'error 42501', 'anon', anonimo, crear_mensaje);
  perform pg_temp.probar('Memoria anon cambia mensaje', 'error 42501', 'anon', anonimo, format($q$update public.agente_mensajes set contenido = '{}' where id = %L$q$, mensaje));
  perform pg_temp.probar('Memoria anon borra mensaje', 'error 42501', 'anon', anonimo, format('delete from public.agente_mensajes where id = %L', mensaje));
  perform pg_temp.probar('Memoria sin rol lee conversación', 'filas=0', 'authenticated', sin_rol, format('select id from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria sin rol crea conversación', 'error 42501', 'authenticated', sin_rol, crear_conversacion);
  perform pg_temp.probar('Memoria sin rol cambia conversación', 'filas=0', 'authenticated', sin_rol, format($q$update public.agente_conversaciones set titulo = 'Cambio prohibido' where id = %L$q$, conversacion));
  perform pg_temp.probar('Memoria sin rol borra conversación', 'filas=0', 'authenticated', sin_rol, format('delete from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria sin rol lee mensaje', 'filas=0', 'authenticated', sin_rol, format('select id from public.agente_mensajes where id = %L', mensaje));
  perform pg_temp.probar('Memoria sin rol crea mensaje', 'error 42501', 'authenticated', sin_rol, crear_mensaje);
  perform pg_temp.probar('Memoria sin rol cambia mensaje', 'filas=0', 'authenticated', sin_rol, format($q$update public.agente_mensajes set contenido = '{}' where id = %L$q$, mensaje));
  perform pg_temp.probar('Memoria sin rol borra mensaje', 'filas=0', 'authenticated', sin_rol, format('delete from public.agente_mensajes where id = %L', mensaje));
  perform pg_temp.probar('Memoria admin aal1 lee conversación', 'filas=0', 'authenticated', admin_aal1, format('select id from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria admin aal1 crea conversación', 'error 42501', 'authenticated', admin_aal1, crear_conversacion);
  perform pg_temp.probar('Memoria admin aal1 cambia conversación', 'filas=0', 'authenticated', admin_aal1, format($q$update public.agente_conversaciones set titulo = 'Cambio prohibido' where id = %L$q$, conversacion));
  perform pg_temp.probar('Memoria admin aal1 borra conversación', 'filas=0', 'authenticated', admin_aal1, format('delete from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria admin aal1 lee mensaje', 'filas=0', 'authenticated', admin_aal1, format('select id from public.agente_mensajes where id = %L', mensaje));
  perform pg_temp.probar('Memoria admin aal1 crea mensaje', 'error 42501', 'authenticated', admin_aal1, crear_mensaje);
  perform pg_temp.probar('Memoria admin aal1 cambia mensaje', 'filas=0', 'authenticated', admin_aal1, format($q$update public.agente_mensajes set contenido = '{}' where id = %L$q$, mensaje));
  perform pg_temp.probar('Memoria admin aal1 borra mensaje', 'filas=0', 'authenticated', admin_aal1, format('delete from public.agente_mensajes where id = %L', mensaje));
  perform pg_temp.probar('Memoria admin aal2 lee conversación', 'filas=1', 'authenticated', admin_aal2, format('select id from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria admin aal2 lee mensaje', 'filas=1', 'authenticated', admin_aal2, format('select id from public.agente_mensajes where id = %L', mensaje));
  perform pg_temp.probar('Memoria insertar mensaje actualiza fecha', 'filas=1', 'authenticated', admin_aal2, format('select id from public.agente_conversaciones where id = %L and actualizado_en = now() and actualizado_en > now() - interval ''1 day'' and creado_por = auth.uid()', conversacion));
  perform pg_temp.probar('Memoria rol inválido', 'error 23514', 'authenticated', admin_aal2, format($q$insert into public.agente_mensajes (id, conversacion_id, rol, contenido) values (gen_random_uuid(), %L, 'invalido', '{}')$q$, conversacion));
  perform pg_temp.probar('Memoria título vacío', 'error 23514', 'authenticated', admin_aal2, $q$insert into public.agente_conversaciones (titulo) values ('   ')$q$);
  perform pg_temp.probar('Memoria título demasiado largo', 'error 23514', 'authenticated', admin_aal2, $q$insert into public.agente_conversaciones (titulo) values (repeat('a', 121))$q$);
  perform pg_temp.probar('Memoria admin aal2 cambia conversación', 'filas=1', 'authenticated', admin_aal2, format($q$update public.agente_conversaciones set titulo = 'Título cambiado', actualizado_en = now() - interval '2 days' where id = %L$q$, conversacion));
  perform pg_temp.probar('Memoria actualizar conversación fija fecha', 'filas=1', 'authenticated', admin_aal2, format('select id from public.agente_conversaciones where id = %L and actualizado_en = now()', conversacion));
  perform pg_temp.probar('Memoria admin aal2 borra conversación', 'filas=1', 'authenticated', admin_aal2, format('delete from public.agente_conversaciones where id = %L', conversacion));
  perform pg_temp.probar('Memoria borrado en cascada del mensaje', 'filas=0', 'service_role', '{"role":"service_role"}', format('select id from public.agente_mensajes where id = %L', mensaje));

  -- PU-08: publicar y restaurar con service_role, como la función `panel` (sección 21.1).
  perform pg_temp.probar('PU-08 admin crea borrador', 'filas=1', 'authenticated', admin_aal2, $q$insert into public.versiones_contenido (estado, version_contrato, json) values ('borrador', '1.0.1', '{"marca":"pu08"}')$q$);
  perform pg_temp.probar('PU-08 revisión distinta no publica', 'error P0001', 'service_role', '{"role":"service_role"}', format('select public.publicar_borrador(99, %L)', admin));
  perform pg_temp.probar('PU-08 tras el fallo sigue el borrador', 'filas=1', 'service_role', '{"role":"service_role"}', $q$select 1 from public.versiones_contenido where estado = 'borrador' and json ->> 'marca' = 'pu08'$q$);
  perform pg_temp.probar('PU-08 publicar', 'filas=1', 'service_role', '{"role":"service_role"}', format('select public.publicar_borrador(1, %L)', admin));
  perform pg_temp.probar('PU-08 publicada nueva con autor y fecha', 'filas=1', 'service_role', '{"role":"service_role"}', format($q$select 1 from public.versiones_contenido where estado = 'publicada' and json ->> 'marca' = 'pu08' and publicada_por = %L and publicada_en is not null$q$, admin));
  perform pg_temp.probar('PU-08 la anterior es la que estaba', 'filas=1', 'service_role', '{"role":"service_role"}', $q$select 1 from public.versiones_contenido where estado = 'anterior' and json ->> 'estado' = 'ejemplo'$q$);
  perform pg_temp.probar('PU-08 sin borrador tras publicar', 'filas=0', 'service_role', '{"role":"service_role"}', $q$select 1 from public.versiones_contenido where estado = 'borrador'$q$);
  perform pg_temp.probar('PU-08 restaurar', 'filas=1', 'service_role', '{"role":"service_role"}', 'select public.restaurar_anterior()');
  perform pg_temp.probar('PU-08 restaurada la original', 'filas=1', 'service_role', '{"role":"service_role"}', $q$select 1 from public.versiones_contenido where estado = 'publicada' and json ->> 'estado' = 'ejemplo'$q$);
  perform pg_temp.probar('PU-08 restaurar se puede deshacer', 'filas=1', 'service_role', '{"role":"service_role"}', $q$select 1 from public.versiones_contenido where estado = 'anterior' and json ->> 'marca' = 'pu08'$q$);
  perform pg_temp.probar('PU-08 máximo una publicada y una anterior', 'filas=2', 'service_role', '{"role":"service_role"}', $q$select estado from public.versiones_contenido group by estado$q$);
end
$$;

select orden, caso, esperado, obtenido, pasa from resultado order by orden;

rollback;
