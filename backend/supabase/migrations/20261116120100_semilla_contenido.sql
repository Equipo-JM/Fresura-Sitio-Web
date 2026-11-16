-- Semilla de la primera versión publicada (DD-25). Producción arranca sin contenido y un
-- contrato vacío no valida: así «Editar» siempre parte de una copia válida.
-- Contenido: el ejemplo de `datos/contenido-1.0.1.ejemplo.json` de la bóveda (copia en
-- `backend/pruebas/datos/`), con `estado: ejemplo`, que el sitio marca «Por validar» (DD-22).
--
-- Solo inserta si todavía no hay versión publicada y ya existe la cuenta del administrador
-- (`app_metadata.rol = admin`), que queda como autora. Por eso, en un proyecto nuevo se crea
-- primero el administrador y después se aplica esta migración. En `fresura-prueba` no hace
-- nada, porque su versión publicada se cargó a mano el 12 nov 2026.
do $$
declare
  administrador uuid;
begin
  if exists (select 1 from public.versiones_contenido where estado = 'publicada') then
    raise notice 'Ya hay una versión publicada: no se carga la semilla.';
    return;
  end if;

  select id into administrador
  from auth.users
  where raw_app_meta_data ->> 'rol' = 'admin'
  order by created_at
  limit 1;

  if administrador is null then
    raise notice 'No hay cuenta de administrador: créala y vuelve a aplicar la semilla.';
    return;
  end if;

  insert into public.versiones_contenido
    (estado, version_contrato, json, publicada_en, creada_por, publicada_por, nota)
  values (
    'publicada',
    '1.0.1',
    $semilla${
  "version_contrato": "1.0.1",
  "estado": "ejemplo",
  "negocio": {
    "presentacion": {
      "titulo": "Ven, date un gusto bonito",
      "texto": "Fresas con crema hechas a tu manera: elige el tamaño, tus toppings y pídelas por WhatsApp."
    },
    "whatsapp": "573000000000",
    "sedes": [
      {
        "id": "u-nacional",
        "nombre": "Sede U Nacional",
        "direccion": "Calle 45 # 28-10",
        "horarios": [
          {
            "dias": "Lunes a domingo y festivos",
            "horas": "12:00 m. a 8:00 p. m. Cierre por almuerzo: 2:00 a 2:30 p. m."
          }
        ],
        "ubicacion": {
          "lat": 4.6347,
          "lng": -74.0785
        },
        "atiende_pedidos": true,
        "radio_domicilio_km": 5,
        "whatsapp": null
      },
      {
        "id": "u-javeriana",
        "nombre": "Sede U Javeriana",
        "direccion": "Calle 41 # 8-56",
        "horarios": [
          {
            "dias": "Lunes a viernes",
            "horas": "10:00 a. m. a 7:00 p. m."
          },
          {
            "dias": "Sábados y festivos",
            "horas": "12:00 m. a 7:30 p. m."
          },
          {
            "dias": "Domingos",
            "horas": "Cerrado"
          }
        ],
        "ubicacion": {
          "lat": 4.6287,
          "lng": -74.0656
        },
        "atiende_pedidos": false,
        "radio_domicilio_km": null,
        "whatsapp": null
      }
    ],
    "redes": {
      "instagram": "https://www.instagram.com/fresuraco/",
      "tiktok": "https://www.tiktok.com/@fresuraco",
      "facebook": "https://www.facebook.com/p/Fresuraco-61552207710721/"
    }
  },
  "productos": [
    {
      "id": "arma-tu-fresota",
      "categoria": "fresotas",
      "nombre": "Arma tu Fresota",
      "descripcion": "Descripción por validar.",
      "imagen": {
        "ruta": "https://ejemplo.invalid/fresas.webp",
        "alt": "Vaso de fresas con crema",
        "ancho": 800,
        "alto": 800
      },
      "vigente": true,
      "destacado": true,
      "orden": 0,
      "presentaciones": [
        {
          "id": "13-oz",
          "nombre": "13 oz",
          "descripcion": null,
          "precio": 20900
        }
      ],
      "caracteristicas": [
        "Incluye 1 base, 2 espolvoreados, 2 salsas y 2 toppings"
      ],
      "grupos_opciones": [
        {
          "id": "toppings",
          "nombre": "Toppings",
          "tipo": "varias",
          "obligatorio": false,
          "maximo": 2,
          "opciones": [
            {
              "id": "merenguitos",
              "nombre": "Merenguitos",
              "adicional": 0
            },
            {
              "id": "barquillos",
              "nombre": "Barquillos",
              "adicional": 0
            },
            {
              "id": "moritas",
              "nombre": "Moritas",
              "adicional": 0
            }
          ]
        },
        {
          "id": "base",
          "nombre": "Base",
          "tipo": "una",
          "obligatorio": false,
          "maximo": 1,
          "opciones": [
            {
              "id": "arequipe",
              "nombre": "Arequipe",
              "adicional": 0
            },
            {
              "id": "nutella",
              "nombre": "Nutella",
              "adicional": 3000
            }
          ]
        },
        {
          "id": "adicionales",
          "nombre": "Adicionales",
          "tipo": "varias",
          "obligatorio": false,
          "maximo": 2,
          "opciones": [
            {
              "id": "arandanos",
              "nombre": "Arándanos",
              "adicional": 3000
            },
            {
              "id": "helado",
              "nombre": "Helado",
              "adicional": 3000
            }
          ]
        },
        {
          "id": "espolvoreados",
          "nombre": "Espolvoreados",
          "tipo": "varias",
          "obligatorio": false,
          "maximo": 2,
          "opciones": [
            {
              "id": "oreo",
              "nombre": "Oreo",
              "adicional": 0
            },
            {
              "id": "milo",
              "nombre": "Milo",
              "adicional": 0
            },
            {
              "id": "coco-rallado",
              "nombre": "Coco rallado",
              "adicional": 0
            }
          ]
        },
        {
          "id": "salsas",
          "nombre": "Salsas",
          "tipo": "varias",
          "obligatorio": false,
          "maximo": 2,
          "opciones": [
            {
              "id": "leche-condensada",
              "nombre": "Leche condensada",
              "adicional": 0
            },
            {
              "id": "chocolate",
              "nombre": "Chocolate",
              "adicional": 0
            },
            {
              "id": "maracuya",
              "nombre": "Maracuyá",
              "adicional": 0
            }
          ]
        }
      ]
    }
  ],
  "promociones": [
    {
      "id": "martes-de-fresas",
      "titulo": "Martes de fresas: 2 × 1 en Fresotas",
      "productos": [
        "arma-tu-fresota"
      ],
      "vigencia": {
        "desde": "2026-11-03",
        "hasta": "2026-11-24"
      },
      "condiciones": "En la sede U Nacional, no acumulable con otras promociones."
    }
  ],
  "preguntas_frecuentes": [
    {
      "id": "como-pido",
      "pregunta": "¿Cómo hago mi pedido?",
      "respuesta": "Arma tu pedido en el sitio y envíalo por WhatsApp.",
      "orden": 0
    }
  ],
  "opiniones": {
    "mostrar": true,
    "calificacion": 4.8,
    "numero_opiniones": 120,
    "fecha_corte": "2026-11-01",
    "url_ficha": "https://www.google.com/maps/place/Fresura"
  },
  "categorias": [
    {
      "id": "fresitas",
      "nombre": "Fresitas",
      "orden": 0
    },
    {
      "id": "fresotas",
      "nombre": "Fresotas",
      "orden": 1
    },
    {
      "id": "fresuras",
      "nombre": "Fresuras",
      "orden": 2
    },
    {
      "id": "chocolate",
      "nombre": "Fresas con chocolate",
      "orden": 3
    },
    {
      "id": "miti",
      "nombre": "Miti Miti",
      "orden": 4
    },
    {
      "id": "compartir",
      "nombre": "Para compartir",
      "orden": 5
    }
  ]
}$semilla$::jsonb,
    now(),
    administrador,
    administrador,
    'Semilla inicial (DD-25)'
  );
end
$$;
