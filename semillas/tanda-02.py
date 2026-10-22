# Tanda 2 (22-oct-2026): vlogs cinematográficos de proyectos grandes, sin trabajo extra para Max (vault Estudio: Narrativa, Lo que voy aprendiendo de Max).
# Uso: python3 semillas/tanda-02.py → semillas/tanda-02.json; cargar con herramientas/sembrar.mjs.
import json, pathlib

C, V, P, E = "camara", "voz", "pantalla", "escena"

def b(t, modo, dice, hace="", ve="", plano="", seg=None):
    x = {"t": t, "modo": modo, "dice": dice}
    if hace: x["hace"] = hace
    if ve: x["ve"] = ve
    if plano: x["plano"] = plano
    if seg: x["seg"] = seg
    return x

def r(que, detalle=""):
    return {"que": que, "detalle": detalle} if detalle else {"que": que}

TANDA = [
  dict(fecha="2026-10-23", pilar="proyectos", formato="Sistema completo · vlog", titulo="El sistema que edita mis videos",
    datos=dict(
      por_que="Abre la cuenta con lo más sólido: un sistema completo que ya funciona, visto funcionando en el mismo video. "
              "Sentimiento: calma y asombro. Da confianza porque no es una promesa: es algo que existe.",
      origen="objeto (el sistema) + espacio (tu escritorio)",
      ganchos_alt=["Grabé esto en dos minutos. No he abierto un editor.", "Este video se editó solo. Te muestro cómo."],
      duracion="50–70 s",
      grabar={"plano": "Medio, sentado, a la altura de los ojos, con aire a un lado", "lugar": "Tu escritorio, con una lámpara cálida encendida al fondo",
              "luz": "Ventana o lámpara de lado: un lado de la cara iluminado y el otro en sombra suave", "ropa": "Oscura y lisa"},
      beats=[
        b("GANCHO", C, "Este video lo grabé en dos minutos. Todo lo demás lo hizo un sistema.",
          hace="Sentado, quieto, mirando al lente. Pausa de un segundo después de «dos minutos».", plano="Medio, con aire a tu lado"),
        b("EL CALENDARIO", V, "Cada día abro mi calendario y ahí está lo que toca: qué digo, cómo lo grabo y qué tomas necesito.",
          ve="Grabación de pantalla del celular: abres el Estudio, tocas el video de hoy y bajas lento por el guion (15 s)."),
        b("GRABAR", E, "(dejas el celular en el trípode y partes el teleprompter)",
          hace="Tus manos poniendo el celular en el trípode y tocando «Partir», sin hablar.",
          ve="Si tienes a mano otro celular o el Mac, grábalo desde el lado (5–8 s). Si no, sáltalo: lo cubro yo con pantallas."),
        b("SUBIR", V, "Grabo, subo las tomas y aprieto un botón.",
          ve="Grabación de pantalla del celular subiendo las tomas de ESTE video y tocando «Listo para editar» (10 s). Lo haces igual al terminar."),
        b("LA EDICIÓN", P, "Desde ahí, una inteligencia artificial hace la edición: elige las mejores tomas, corta, pone subtítulos, música y sonido, y me deja el video listo para publicar.",
          ve="Lo grabo yo: la edición de este mismo video ocurriendo en pantalla."),
        b("QUIÉN", C, "Soy Max, cofundador de Optimizo. Armamos sistemas así: para que una empresa haga más con menos.",
          hace="Tranquilo, mirando al lente."),
        b("CIERRE", C, "Yo solo tengo que tener algo que contar.",
          hace="Lento. Al terminar, te quedas un segundo en silencio mirando al lente."),
      ],
      broll=["Detalles de tu escritorio con la luz que tengas: la lámpara, el teclado, una taza (3 clips de 3 s; 60 fps si puedes)"],
      recursos=[],
      props=["Trípode", "Teleprompter abierto en el Mac o el iPad, bajo el lente"],
      edicion={"estilo": "Cinematográfico y sereno. Plano fijo con luz lateral; la interfaz del Estudio aparece flotando, limpia, como en un comercial de Apple. La edición en marcha se ve como un timelapse elegante. Cierre en silencio.",
               "subtitulos": "Limpios, abajo, palabra activa discreta; «dos minutos» y «un sistema» un poco más grandes",
               "musica": "Piano y cuerdas suaves con un pulso electrónico lento (70–85 BPM); crece en «la edición» y se apaga para el cierre",
               "efectos": ["Aire suave en cada aparición de la interfaz", "Teclas lejanas en el timelapse de edición", "Silencio total el último segundo"],
               "ritmo": "Pausado: planos de 3–5 s y acercamientos lentos; un poco más rápido solo en la edición"},
      post={"texto": "Grabo dos minutos. El resto lo hace un sistema.", "hashtags": ["#inteligenciaartificial", "#automatizacion", "#emprendimiento", "#creadordecontenido", "#optimizo"],
            "sonido": "Piano o ambiente cinematográfico en tendencia (te digo cuál y desde qué segundo)"})),

  dict(fecha="2026-10-27", pilar="proyectos", formato="Proyecto por dentro", titulo="Medula, por dentro",
    datos=dict(
      por_que="El producto estrella mostrado como lo que es: algo grande que se está construyendo en serio. Sentimiento: orgullo tranquilo.",
      origen="objeto (Medula)",
      ganchos_alt=["Llevamos [tiempo] construyendo esto.", "Esto es lo más grande que estamos haciendo."],
      duracion="45–70 s",
      grabar={"plano": "Medio, sentado frente a la pantalla con Medula abierta", "lugar": "Escritorio", "luz": "Baja y cálida, la pantalla encendida", "ropa": "Oscura"},
      beats=[
        b("GANCHO", C, "Esto es Medula. [Qué hace, en una frase.]", hace="Tranquilo, de lado a la pantalla; giras al lente para decirlo."),
        b("QUÉ ES", P, "[Para quién es y qué le resuelve.]", ve="Grabación de pantalla usando Medula como la usas normalmente (30–60 s, sin datos de clientes). Yo elijo los momentos."),
        b("DÓNDE ESTÁ", V, "[Dónde está hoy: lo que ya funciona.]", ve="Lo cubro yo con pantallas de Medula."),
        b("LO QUE VIENE", C, "[Lo que viene, en una frase.]", hace="Mirando al lente."),
        b("CIERRE", C, "[Una frase tuya sobre por qué la estamos haciendo.]", hace="Lento; un segundo de silencio al final."),
      ],
      broll=[],
      recursos=[r("Qué decir de Medula", "Cuéntamelo como se lo contarías a un amigo (por chat o en la nota) y lo dejo como guion exacto."),
                r("Qué se puede mostrar en pantalla", "Y qué no: precios, clientes, cosas sin lanzar.")],
      props=[],
      edicion={"estilo": "Producto premium: pantallas flotando con profundidad, tú en penumbra, acercamientos lentos.", "subtitulos": "Limpios, abajo", "musica": "Ambiente cinematográfico con pulso", "efectos": ["Aire suave en las transiciones de pantalla"], "ritmo": "Pausado"},
      post={"texto": "Medula, por dentro.", "hashtags": ["#medula", "#inteligenciaartificial", "#emprendimiento", "#producto", "#optimizo"], "sonido": "Ambiente cinematográfico en tendencia"})),

  dict(fecha="2026-10-30", pilar="proyectos", formato="Sistema en tiempo real", titulo="María llama",
    datos=dict(
      por_que="Escuchar una llamada real hecha por una IA, con el flujo moviéndose: asombro y un poco de vértigo. Muestra un sistema completo de Optimizo sin vender.",
      origen="persona (María) + objeto (el flujo en tiempo real)",
      ganchos_alt=["La persona que hizo esta llamada no existe.", "Esto antes lo hacía un equipo completo."],
      duracion="45–70 s",
      grabar={"plano": "Primer plano, sentado, con la pantalla del flujo detrás o al lado", "lugar": "Escritorio", "luz": "Baja y cálida; la pantalla encendida", "ropa": "Oscura"},
      beats=[
        b("GANCHO", C, "Esta llamada la hizo una inteligencia artificial. Escucha.",
          hace="Casi en voz baja. Después de «escucha» te quedas en silencio mirando al lente.", plano="Primer plano"),
        b("LA LLAMADA", P, "(se escucha la llamada de María, 8–12 segundos)",
          ve="Una llamada de María grabada CON AUDIO y con el flujo moviéndose en tiempo real (de prueba o con permiso)."),
        b("QUÉ HACE", V, "María llama, entiende lo que la persona necesita y agenda. Mientras habla, todo queda anotado solo.",
          ve="El flujo de Nexor avanzando paso a paso (lo saco de la misma grabación)."),
        b("QUIÉN LO ARMA", C, "Esto lo arma Joaco, otro de los cofundadores de Optimizo. Es el flujo comercial completo, de punta a punta.",
          hace="Tranquilo, con un gesto hacia la pantalla."),
        b("EL NÚMERO", P, "[Un número real: cuántas llamadas, cuántas reuniones agendadas, en cuánto tiempo.]",
          ve="La pantalla con ese número (difumino nombres)."),
        b("CIERRE", C, "Antes esto era un equipo completo. Ahora es un sistema.",
          hace="Lento. Un segundo en silencio mirando al lente al terminar."),
      ],
      broll=[],
      recursos=[r("Una llamada de María con audio y el flujo en pantalla", "Pídesela a Joaco: de prueba o real con permiso de la persona."),
                r("Un número real del sistema", "El más impresionante que sea cierto."),
                r("OK de Joaco para mostrarlo")],
      props=[],
      edicion={"estilo": "Thriller tranquilo: oscuro, la pantalla como única luz, la onda de audio de María dibujándose al centro. Corte a negro antes del cierre.", "subtitulos": "Lo que dice María en otro color, como subtítulo de película", "musica": "Pulso grave y lento; desaparece durante la llamada", "efectos": ["Tono de llamada al inicio", "Clic suave en cada paso del flujo", "Grave profundo en «ahora es un sistema»"], "ritmo": "Pausado; la llamada se deja respirar"},
      post={"texto": "Esta llamada la hizo una IA.", "hashtags": ["#inteligenciaartificial", "#ventas", "#automatizacion", "#emprendimiento", "#optimizo"], "sonido": "Ambiente propio (la llamada tiene que escucharse)"})),

  dict(fecha="2026-11-03", pilar="vida", formato="Vlog sin hablar", titulo="Una noche construyendo",
    datos=dict(
      por_que="Pura atmósfera: cómo se siente construir algo grande de noche. Sentimiento: calma, foco, un poco de soledad. Cero trabajo extra: se graba una noche que igual ibas a trabajar.",
      origen="espacio (tu escritorio de noche)",
      ganchos_alt=[],
      duracion="30–45 s",
      grabar={"plano": "Clips cortos de detalle, celular apoyado (no en la mano)", "lugar": "Donde trabajes esa noche", "luz": "Solo pantallas y una lámpara", "ropa": "La que tengas"},
      beats=[
        b("APERTURA", E, "(la ciudad o la ventana de noche, y la lámpara que se enciende)", hace="Enciendes la lámpara.", ve="La ventana o la calle (5 s) y tu mano encendiendo la lámpara (3 s)."),
        b("TRABAJO", E, "(clips de trabajo: manos, pantallas, café, tu cara iluminada)", ve="8–12 clips de 3–5 s a lo largo de la noche. Celular apoyado, sin moverlo."),
        b("PENSAR", E, "(te echas para atrás y miras la pantalla un rato)", ve="Un plano tuyo de lado, quieto (5 s)."),
        b("UNA FRASE", V, "[Una sola frase sobre lo que estabas construyendo esa noche.]", ve="Lo cubro con los clips de la noche."),
        b("CIERRE", E, "(apagas la pantalla y la lámpara)", ve="La pantalla apagándose y la lámpara (4 s)."),
      ],
      broll=[],
      recursos=[r("La frase", "Dímela en la nota cuando subas los clips: qué estabas haciendo esa noche.")],
      props=[],
      edicion={"estilo": "Cine nocturno: tonos fríos con la lámpara cálida, grano fino, cámara lenta en los detalles, una sola frase en pantalla.", "subtitulos": "Solo la frase final", "musica": "Piano o lo-fi lento en tendencia", "efectos": ["Teclas y ambiente de noche, muy bajos"], "ritmo": "Lento, al pulso de la música"},
      post={"texto": "Una noche construyendo.", "hashtags": ["#vlog", "#emprendimiento", "#inteligenciaartificial", "#nightwork", "#optimizo"], "sonido": "Piano o lo-fi lento en tendencia"})),
]

for v in TANDA:
    v["gancho"] = v["datos"]["beats"][0]["dice"]
pathlib.Path(__file__).with_name("tanda-02.json").write_text(json.dumps(TANDA, ensure_ascii=False, indent=2) + "\n")
print("ok", len(TANDA))
