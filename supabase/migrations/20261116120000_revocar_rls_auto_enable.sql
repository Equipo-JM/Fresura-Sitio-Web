-- Quita a la API el permiso de ejecutar `public.rls_auto_enable()` (DT-01, sección 30.2, diferencia 8).
-- La función la crea la opción «RLS automático» del panel de Supabase y la usa el disparador
-- de eventos `ensure_rls`, que sigue funcionando: los disparadores no necesitan este permiso.
-- Va en un bloque condicional porque un proyecto sin esa opción no tiene la función.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
