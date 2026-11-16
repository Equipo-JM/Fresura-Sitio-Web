-- Da a `service_role` los permisos de tabla que necesitan `publicar_borrador` y
-- `restaurar_anterior`, que se ejecutan con los permisos de quien las llama (DD-02).
-- En `fresura-prueba` la tabla solo tenía TRUNCATE, REFERENCES y TRIGGER para
-- `service_role`, así que la función `panel` no podía leer el borrador ni publicar.
-- Lo detectó PU-08 en `backend/pruebas/rls/permisos.sql`. Sin INSERT: nadie crea
-- versiones con `service_role`; el borrador lo crea el administrador con RLS.
grant select, update, delete on public.versiones_contenido to service_role;
