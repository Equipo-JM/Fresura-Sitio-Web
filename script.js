
/* ==========================================
   FRESURA - JAVASCRIPT

   Funcionalidades:
   1. Personalización de pedidos.
   2. Envío de pedidos por WhatsApp.
   3. Visualización de dos tiendas.
   4. Mapa interactivo con Leaflet.
   5. Botones para consultar rutas.
   ========================================== */


/* ==========================================
   1. CONFIGURACIÓN GENERAL
   ========================================== */

/*
   Número utilizado actualmente en el proyecto.

   Se debe confirmar con Fresura que
   corresponde al canal oficial.
*/

const NUMERO_WHATSAPP = "573178341120";


/*
   Información de las tiendas.

   Usamos un ARREGLO de OBJETOS.

   Un arreglo permite almacenar varios
   elementos, y cada objeto agrupa los datos
   de una tienda.

   IMPORTANTE:
   Las coordenadas son aproximadas.
   Confirmar los puntos exactos antes
   de publicar el sitio.
*/

const tiendasFresura = [

    {
        nombre: "Sede U Nacional",

        direccion: "Calle 45 #28-10, Bogotá",

        lat: 4.6347,
        lng: -74.0785
    },

    {
        nombre: "Sede U Javeriana",

        direccion: "Calle 41 #8-56, Bogotá",

        lat: 4.6287,
        lng: -74.0656
    }

];


/* ==========================================
   2. ESPERAR A QUE CARGUE EL HTML
   ========================================== */

/*
   DOMContentLoaded se ejecuta cuando
   el navegador termina de interpretar
   el documento HTML.

   Es importante porque nuestro código
   necesita buscar elementos del HTML.
*/

document.addEventListener(
    "DOMContentLoaded",
    function () {

        configurarFormulario();

        crearSeccionTiendas();

    }
);


/* ==========================================
   3. CONFIGURAR FORMULARIO
   ========================================== */

function configurarFormulario() {

    /*
       Buscamos el formulario utilizando su ID.

       En index.html existe:

       <form id="form-pedido">
    */

    const formulario =
        document.getElementById("form-pedido");


    /*
       Comprobamos que realmente existe.
    */

    if (!formulario) {
        return;
    }


    /*
       addEventListener permite escuchar
       acciones del usuario.

       "submit" ocurre cuando se intenta
       enviar el formulario.
    */

    formulario.addEventListener(
        "submit",
        function (evento) {

            /*
               Evitamos que el navegador
               recargue la página.
            */

            evento.preventDefault();


            /*
               Comprobamos los campos
               obligatorios del formulario.
            */

            if (!formulario.checkValidity()) {

                formulario.reportValidity();

                return;
            }


            /* OBTENER INFORMACIÓN */

            const tamanoSelect =
                document.getElementById("tamano");

            const entregaSelect =
                document.getElementById("entrega");


            /*
               selectedIndex indica la opción
               seleccionada dentro del <select>.
            */

            const tamano =
                tamanoSelect.options[
                    tamanoSelect.selectedIndex
                ].text;


            const entrega =
                entregaSelect.options[
                    entregaSelect.selectedIndex
                ].text;


            /*
               .value obtiene el contenido
               escrito o seleccionado.

               .trim() elimina espacios
               innecesarios.
            */

            const nombre =
                document.getElementById("nombre")
                    .value.trim();

            const telefono =
                document.getElementById("telefono")
                    .value.trim();

            const zona =
                document.getElementById("zona")
                    .value.trim();

            const observaciones =
                document.getElementById("observaciones")
                    .value.trim();


            /* OBTENER TOPPINGS */

            const toppings =
                obtenerToppings();


            /* CREAR MENSAJE */

            let mensaje =
                "¡Hola, Fresura Bogotá!\n\n" +
                "Quisiera solicitar el siguiente pedido:\n\n";


            mensaje +=
                `*Nombre:* ${nombre}\n`;

            mensaje +=
                `*Teléfono:* ${telefono}\n`;

            mensaje +=
                `*Tamaño:* ${tamano}\n`;


            /*
               Si el usuario seleccionó toppings,
               los unimos usando join().

               Si no seleccionó ninguno,
               escribimos "Ninguno".
            */

            if (toppings.length > 0) {

                mensaje +=
                    `*Toppings:* ${toppings.join(", ")}\n`;

            } else {

                mensaje +=
                    "*Toppings:* Ninguno\n";
            }


            mensaje +=
                `*Entrega:* ${entrega}\n`;


            if (zona !== "") {

                mensaje +=
                    `*Barrio o zona:* ${zona}\n`;
            }


            if (observaciones !== "") {

                mensaje +=
                    `*Observaciones:* ${observaciones}\n`;
            }


            mensaje +=
                "\nQuedo atento(a) para confirmar " +
                "el precio y la disponibilidad.";


            /* CONSTRUIR ENLACE DE WHATSAPP */

            /*
               encodeURIComponent convierte
               el mensaje a un formato válido
               para una dirección URL.
            */

            const urlWhatsApp =
                `https://wa.me/${NUMERO_WHATSAPP}` +
                `?text=${encodeURIComponent(mensaje)}`;


            /*
               Abrimos WhatsApp.

               No se guarda el pedido
               en una base de datos.
            */

            window.open(
                urlWhatsApp,
                "_blank",
                "noopener,noreferrer"
            );

        }
    );
}


/* ==========================================
   4. OBTENER TOPPINGS SELECCIONADOS
   ========================================== */

function obtenerToppings() {

    /*
       Creamos un arreglo vacío.
    */

    const toppings = [];


    /*
       querySelectorAll obtiene todos
       los checkbox seleccionados
       cuyo name es "toppings".
    */

    const seleccionados =
        document.querySelectorAll(
            'input[name="toppings"]:checked'
        );


    /*
       forEach recorre cada checkbox.
    */

    seleccionados.forEach(
        function (checkbox) {

            /*
               Buscamos el label asociado
               a ese checkbox.
            */

            const etiqueta =
                document.querySelector(
                    `label[for="${checkbox.id}"]`
                );


            if (etiqueta) {

                toppings.push(
                    etiqueta.textContent.trim()
                );

            }

        }
    );


    /*
       Devolvemos los toppings seleccionados.
    */

    return toppings;
}


/* ==========================================
   5. CREAR SECCIÓN DE UBICACIONES
   ========================================== */

function crearSeccionTiendas() {

    /*
       Buscamos la sección de contacto
       que ya existe en index.html.
    */

    const contacto =
        document.getElementById("contacto");


    if (!contacto) {
        return;
    }


    /*
       Evitamos crear la sección dos veces.
    */

    if (
        document.getElementById("mapa-tiendas")
    ) {
        return;
    }


    /*
       Creamos un nuevo div mediante JavaScript.
    */

    const contenedor =
        document.createElement("div");


    /*
       Esta clase existe en style.css.
    */

    contenedor.className =
        "ubicaciones-fresura";


    /*
       Construimos una estructura HTML.

       Después colocaremos las tarjetas
       dentro de tiendas-lista.
    */

    contenedor.innerHTML = `

        <h3>Nuestras tiendas en Bogotá</h3>

        <p>
            Tenemos dos sedes.
            Selecciona una para conocer
            su ubicación en el mapa.
        </p>

        <div class="ubicaciones-grid">

            <div
                id="lista-tiendas"
                class="tiendas-lista"
            ></div>

            <div class="mapa-contenedor">

                <div
                    id="mapa-tiendas"
                    role="region"
                    aria-label="Mapa interactivo de las tiendas Fresura"
                ></div>

                <p
                    id="estado-mapa"
                    aria-live="polite"
                >
                    Cargando mapa...
                </p>

            </div>

        </div>
    `;


    /*
       Insertamos las ubicaciones
       antes del bloque address.
    */

    const direccion =
        contacto.querySelector("address");


    if (direccion) {

        contacto.insertBefore(
            contenedor,
            direccion
        );

    } else {

        contacto.appendChild(
            contenedor
        );

    }


    /*
       Creamos las tarjetas.
    */

    crearTarjetasTiendas();


    /*
       Inicializamos el mapa.
    */

    iniciarMapa();


    /*
       Actualizamos el enlace antiguo
       de ubicación que tenía href="#".
    */

    const enlaces =
        contacto.querySelectorAll('a[href="#"]');


    enlaces.forEach(function (enlace) {

        if (
            enlace.textContent
                .toLowerCase()
                .includes("ubicación")
        ) {

            enlace.href = "#mapa-tiendas";

            enlace.textContent =
                "Ver nuestras sedes en el mapa";
        }

    });

}


/* ==========================================
   6. CREAR LAS TARJETAS DE LAS SEDES
   ========================================== */

function crearTarjetasTiendas() {

    /*
       Buscamos el lugar donde
       aparecerán las tarjetas.
    */

    const lista =
        document.getElementById("lista-tiendas");


    /*
       Recorremos el arreglo de tiendas.
    */

    tiendasFresura.forEach(
        function (tienda, indice) {

            /*
               Creamos un elemento article
               para cada sede.
            */

            const tarjeta =
                document.createElement("article");


            tarjeta.className =
                "tienda-card";


            /*
               Creamos el título.
            */

            const titulo =
                document.createElement("h4");

            titulo.textContent =
                tienda.nombre;


            /*
               Creamos la dirección.
            */

            const direccion =
                document.createElement("p");

            direccion.textContent =
                tienda.direccion;


            /*
               Creamos el botón para ver
               la sede en el mapa.
            */

            const botonMapa =
                document.createElement("button");


            botonMapa.type =
                "button";


            botonMapa.className =
                "boton-tienda";


            botonMapa.textContent =
                "Ver en el mapa";


            /*
               Asociamos cada botón
               con su índice del arreglo.

               Por ejemplo:

               0 = Sede U Nacional
               1 = Sede U Javeriana
            */

            botonMapa.dataset.tienda =
                indice;


            /*
               Creamos el enlace
               para abrir Google Maps.
            */

            const enlaceRuta =
                document.createElement("a");


            enlaceRuta.className =
                "enlace-ruta";


            enlaceRuta.textContent =
                "Cómo llegar";


            enlaceRuta.href =
                crearEnlaceGoogleMaps(tienda);


            enlaceRuta.target =
                "_blank";


            enlaceRuta.rel =
                "noopener noreferrer";


            /*
               Agrupamos los botones.
            */

            const acciones =
                document.createElement("div");


            acciones.className =
                "tienda-acciones";


            acciones.appendChild(
                botonMapa
            );


            acciones.appendChild(
                enlaceRuta
            );


            /*
               Añadimos todo a la tarjeta.
            */

            tarjeta.appendChild(titulo);

            tarjeta.appendChild(direccion);

            tarjeta.appendChild(acciones);


            /*
               Y la tarjeta a la lista.
            */

            lista.appendChild(tarjeta);

        }
    );

}


/* ==========================================
   7. GENERAR ENLACE DE GOOGLE MAPS
   ========================================== */

function crearEnlaceGoogleMaps(tienda) {

    /*
       Aunque nuestro mapa utiliza Leaflet,
       el botón "Cómo llegar" puede abrir
       Google Maps sin usar una API.

       Enviamos la dirección como texto.
    */

    const direccion =
        encodeURIComponent(
            tienda.direccion
        );


    return (
        "https://www.google.com/maps/dir/" +
        "?api=1" +
        `&destination=${direccion}`
    );

}


/* ==========================================
   8. CREAR MAPA INTERACTIVO CON LEAFLET
   ========================================== */

function iniciarMapa() {

    /*
       Primero comprobamos que
       Leaflet se haya cargado.

       La variable global L pertenece
       a la biblioteca Leaflet.
    */

    if (typeof L === "undefined") {

        mostrarEstadoMapa(
            "No se pudo cargar Leaflet. " +
            "Comprueba tu conexión a internet."
        );

        return;
    }


    /*
       L.map crea el mapa dentro
       del elemento HTML:

       id="mapa-tiendas"
    */

    const mapa =
        L.map("mapa-tiendas");


    /*
       L.tileLayer agrega la capa visual
       del mapa utilizando OpenStreetMap.

       Estas imágenes se llaman tiles.
    */

   
    /* Cargar las imágenes del mapa desde OpenStreetMap */

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            // Permite enviar el origen de nuestra página.
            referrerPolicy: "strict-origin-when-cross-origin",

            // Reconocimiento obligatorio a OpenStreetMap.
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
    ).addTo(mapa);



    /*
       Creamos un arreglo para almacenar
       las posiciones de los marcadores.
    */

    const posiciones = [];


    /*
       Este arreglo permitirá relacionar
       cada tienda con su marcador.
    */

    const marcadores = [];


    /* ======================================
       CREAR MARCADORES
       ====================================== */

    tiendasFresura.forEach(
        function (tienda) {

            /*
               Coordenadas de la tienda.

               Leaflet utiliza:
               [latitud, longitud].
            */

            const coordenadas = [
                tienda.lat,
                tienda.lng
            ];


            /*
               L.marker crea un marcador.

               addTo(mapa) lo coloca
               en nuestro mapa.
            */

            const marcador =
                L.marker(coordenadas)
                    .addTo(mapa);


            /*
               Creamos una ventana emergente.

               Se mostrará cuando el usuario
               haga clic en el marcador.
            */

            const contenidoPopup =
                document.createElement("div");


            contenidoPopup.className =
                "popup-tienda";


            const titulo =
                document.createElement("strong");

            titulo.textContent =
                tienda.nombre;


            const direccion =
                document.createElement("p");

            direccion.textContent =
                tienda.direccion;


            const enlace =
                document.createElement("a");

            enlace.href =
                crearEnlaceGoogleMaps(tienda);

            enlace.target =
                "_blank";

            enlace.rel =
                "noopener noreferrer";

            enlace.textContent =
                "Cómo llegar";


            contenidoPopup.appendChild(titulo);

            contenidoPopup.appendChild(direccion);

            contenidoPopup.appendChild(enlace);


            /*
               bindPopup asocia la ventana
               emergente al marcador.
            */

            marcador.bindPopup(
                contenidoPopup
            );


            /*
               Guardamos el marcador
               para utilizarlo después.
            */

            marcadores.push(
                marcador
            );


            /*
               Guardamos sus coordenadas.
            */

            posiciones.push(
                coordenadas
            );

        }
    );


    /* ======================================
       AJUSTAR EL MAPA A LAS DOS TIENDAS
       ====================================== */

    /*
       L.latLngBounds calcula una región
       que contiene ambas sedes.
    */

    const limites =
        L.latLngBounds(posiciones);


    /*
       fitBounds ajusta automáticamente
       el centro y zoom del mapa
       para mostrar los dos puntos.
    */

    mapa.fitBounds(
        limites,
        {

            padding: [45, 45],

            maxZoom: 15

        }
    );


    /* ======================================
       ACTIVAR BOTONES DE LAS TARJETAS
       ====================================== */

    const botones =
        document.querySelectorAll(
            ".boton-tienda"
        );


    botones.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    /*
                       dataset.tienda contiene
                       el índice del botón.
                    */

                    const indice =
                        Number(
                            boton.dataset.tienda
                        );


                    /*
                       Obtenemos la tienda.
                    */

                    const tienda =
                        tiendasFresura[indice];


                    /*
                       Obtenemos su marcador.
                    */

                    const marcador =
                        marcadores[indice];


                    /*
                       flyTo mueve el mapa
                       con una animación.
                    */

                    mapa.flyTo(
                        [
                            tienda.lat,
                            tienda.lng
                        ],

                        16,

                        {
                            duration: 1.2
                        }
                    );


                    /*
                       Después abrimos la
                       ventana emergente.
                    */

                    marcador.openPopup();


                    /*
                       Si el usuario está
                       en celular, llevamos
                       la pantalla al mapa.
                    */

                    document
                        .getElementById("mapa-tiendas")
                        .scrollIntoView({

                            behavior: "smooth",

                            block: "center"

                        });

                }
            );

        }
    );


    /*
       Actualizamos el mensaje
       debajo del mapa.
    */

    mostrarEstadoMapa(
        "Selecciona una sede para verla en el mapa. " +
        "Los marcadores son aproximados."
    );

}


/* ==========================================
   9. MOSTRAR ESTADO DEL MAPA
   ========================================== */

function mostrarEstadoMapa(mensaje) {

    /*
       Esta función evita escribir
       varias veces el mismo código.

       Recibe un mensaje y lo muestra
       debajo del mapa.
    */

    const elemento =
        document.getElementById("estado-mapa");


    if (elemento) {

        elemento.textContent =
            mensaje;

    }

}
