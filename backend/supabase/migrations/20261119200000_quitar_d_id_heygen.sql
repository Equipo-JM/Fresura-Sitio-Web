-- Los videos pasan a Dreamina (AI Avatar y Seedance), que no tiene API oficial:
-- el chat ya no genera videos con D-ID ni escribe prompts para HeyGen.

-- Trabajos de render de D-ID (20261118210000).
drop table if exists public.agente_videos;

-- Las piezas de HeyGen guardadas ya no se pueden usar ni mostrar en el panel.
delete from public.biblioteca_piezas where tipo = 'prompt_heygen';

alter table public.biblioteca_piezas
  drop constraint biblioteca_piezas_tipo_check,
  add constraint biblioteca_piezas_tipo_check check (
    tipo in (
      'guion', 'publicacion', 'carrusel', 'prompt_imagen', 'prompt_clip',
      'prompt_avatar_dreamina', 'prompt_seedance', 'variantes_gancho', 'ideas',
      'calendario', 'revision'
    )
  );
