-- AI Avatar de Dreamina no está disponible en Colombia: la presentadora se hace
-- en Seedance con el personaje @fresura guardado en la cuenta, así que la
-- biblioteca deja de admitir el tipo `prompt_avatar_dreamina` (sin filas guardadas).

alter table public.biblioteca_piezas
  drop constraint biblioteca_piezas_tipo_check,
  add constraint biblioteca_piezas_tipo_check check (
    tipo in (
      'guion', 'publicacion', 'carrusel', 'prompt_imagen', 'prompt_clip',
      'prompt_seedance', 'variantes_gancho', 'ideas', 'calendario', 'revision'
    )
  );
