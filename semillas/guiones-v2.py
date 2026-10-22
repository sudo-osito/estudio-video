# Guiones v2: cada párrafo dice cómo se graba (modo), qué haces y qué se ve, y cada video trae lo que Max debe mandar.
# Uso: python3 semillas/guiones-v2.py  → reescribe beats, recursos y broll en semillas/calendario-01.json
# modo: camara (te grabas diciéndolo) · voz (voz en off; se ve otra toma) · pantalla (voz en off sobre grabación de pantalla) · escena (sin hablar)
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

G = {
"2026-10-22": dict(
  beats=[
    b("GANCHO", C, "Durante 30 días voy a subir un video diario. Yo solo grabo. Una IA edita todo.",
      hace="Entras a cuadro sentándote, ya hablando. Levantas tres dedos en «30 días».", plano="Medio, a la altura de los ojos"),
    b("QUIÉN", C, "Soy Max, COO de Cóndor. Hacemos marketing e inteligencia artificial para empresas.",
      hace="Tranquilo, mirando al lente. Un gesto con la mano hacia el Mac de atrás en «inteligencia artificial».", plano="Mismo plano (yo lo acerco en edición)"),
    b("LA REGLA", P, "Yo grabo uno o dos minutos con el celular, lo subo y la IA hace todo: cortes, subtítulos, música, efectos.",
      ve="Grabación de pantalla del celular: abres esta página, entras al video de hoy, tocas «Subir material». 10 segundos, sin apuro."),
    b("LA APUESTA", C, "Si la edición es mala, la culpa es de la IA. Si es buena… también.",
      hace="Después de «buena…» te quedas un segundo serio mirando a cámara, y recién dices «también» con media sonrisa."),
    b("CIERRE", C, "Día uno de treinta. Sígueme para ver si llego al treinta.",
      hace="Apuntas a cámara en «sígueme». Al final te quedas 1 segundo quieto mirando al lente.", plano="Mirando a cámara"),
  ],
  broll=["Tu mano dejando el celular en el trípode (desde el lado, 5 s)"],
  recursos=[]),

"2026-10-23": dict(
  beats=[
    b("GANCHO", C, "Le entregué mi trabajo de COO a una IA por un día completo. Esto es lo que rompió.",
      hace="Serio, como confesando. Pausa breve antes de «esto es lo que rompió»."),
    b("LO QUE LE DI", V, "Le di tres tareas reales: [di tus 3 tareas reales, ej. revisar campañas, responder al equipo, ordenar la semana].",
      ve="Tú en el escritorio escribiéndole a la IA, grabado de lado (5–8 s). Más la pantalla con cada pedido escrito."),
    b("LO QUE HIZO BIEN", P, "Lo que hizo mejor que yo: [lo real].",
      ve="Grabación de pantalla del resultado bueno (20–30 s, scroll lento)."),
    b("LO QUE ROMPIÓ", C, "Y lo que rompió: [lo real, con detalle concreto].",
      hace="Te tapas la cara con la mano al empezar, la sacas y lo cuentas.", plano="Más cerca que el resto"),
    b("REACCIÓN", E, "(mira la pantalla con cara de «¿qué hiciste?», 2 segundos)",
      ve="Tu cara mirando la pantalla del Mac, grabada desde atrás del monitor."),
    b("CONCLUSIÓN", C, "La IA no reemplaza al COO. Reemplaza al COO que no la usa.",
      hace="Firme, mirando al lente. Sin sonreír."),
  ],
  broll=[],
  recursos=[r("Las 3 tareas reales que le diste", "Escríbelas en la nota o en el guion antes de grabar."),
            r("Grabación de pantalla de cada tarea", "30 s de cada una: el pedido y lo que respondió. Sin datos de clientes a la vista."),
            r("Una captura de lo que rompió", "El error tal cual se vio. Si hay nombres, igual mándalo: lo difumino yo.")]),

"2026-10-24": dict(
  beats=[
    b("CLIENTE", C, "Hola, quiero una página web. Algo simple, como Apple.",
      hace="CLIENTE: lentes de sol en la cabeza, sonrisa de vendedor, mirando un poco a la izquierda del lente.", plano="Cuerpo girado hacia la izquierda"),
    b("DISEÑADOR", C, "Perfecto. ¿Para cuándo?",
      hace="DISEÑADOR: capucha puesta, mirando un poco a la derecha del lente, tono cansado.", plano="Cuerpo girado hacia la derecha"),
    b("CLIENTE", C, "Para mañana. Ah, y que no salga caro, si es una página no más.",
      hace="CLIENTE: lo dice como si fuera obvio, haciendo un gesto chico con la mano."),
    b("DISEÑADOR", E, "(mira a cámara en silencio, 2 segundos)",
      hace="DISEÑADOR: giras lento hacia el lente y te quedas inmóvil. Cero expresión.", plano="Mirando directo al lente"),
    b("CLIENTE", C, "Y que tenga inteligencia artificial. Mi sobrino dice que con IA se hace solo.",
      hace="CLIENTE: muy convencido, se toca la sien en «inteligencia artificial»."),
    b("DISEÑADOR", C, "Tu sobrino tiene razón. Que la haga tu sobrino.",
      hace="DISEÑADOR: lo dices tranquilo y te sacas la capucha al terminar, como quien se va."),
  ],
  broll=[],
  recursos=[]),

"2026-10-25": dict(
  beats=[
    b("GANCHO", C, "Así es un día real como COO de una empresa de inteligencia artificial.",
      hace="Grábalo en la mañana con el café en la mano, recién llegando. Caminando hacia el celular si puedes."),
    b("MAÑANA", V, "Primero reviso cómo amanecieron las campañas de los clientes.",
      ve="Café, tu mano abriendo el computador, la pantalla de anuncios difuminada (3 clips de 3–5 s)."),
    b("MEDIODÍA", V, "Después, reuniones: lo que se lanza esta semana y quién hace qué.",
      ve="Tú en una reunión (desde atrás o de lado, sin pantallas con datos), una libreta, el reloj (3 clips)."),
    b("TARDE", V, "En la tarde diseño: sitios, apps, lo que se ve.",
      ve="Pantalla con un diseño en curso, tu mano en el mouse, un detalle de la pantalla de cerca (3 clips)."),
    b("NOCHE", C, "Y en la noche… grabo esto.",
      hace="De noche, con luz baja. Te das vuelta hacia el celular y lo dices con cara de cansado; tomas el celular y cortas.", plano="Más cerca y más oscuro que el gancho"),
  ],
  broll=["Clips sueltos del día (3–5 s cada uno, 15–25 en total): cuantos más, mejor", "Tú apagando el computador"],
  recursos=[r("La hora de cada clip", "No hace falta: la saco del archivo. Solo no lo pases por WhatsApp antes de subirlo.")]),

"2026-10-26": dict(
  beats=[
    b("GANCHO", C, "Tu página web se ve barata, y es por estas tres cosas.",
      hace="Apuntas al lente en «tu». Levantas tres dedos al final."),
    b("UNO", P, "Uno: todo está centrado y apretado. El aire es lo que se ve caro.",
      ve="La web «antes» con todo apretado; luego la misma con espacio. Scroll lento de 5 s cada una."),
    b("DOS", P, "Dos: usas cinco colores. Las marcas caras usan uno y lo repiten.",
      ve="La web «antes» con muchos colores y la arreglada con un solo color de marca."),
    b("TRES", P, "Tres: las fotos son de banco de imágenes. Todo el mundo las reconoce.",
      ve="Una foto típica de banco (gente sonriendo con laptop) y después una foto real de producto o equipo."),
    b("CIERRE", C, "Si quieres que revise la tuya, déjala en los comentarios.",
      hace="Apuntas hacia abajo (donde van los comentarios). Sonrisa corta."),
  ],
  broll=["Scroll lento de una web premium que te guste (10 s)"],
  recursos=[r("La web «antes» y «después»", "Si no tienes una, dime y la armo yo (una plantilla fea y su versión arreglada). Tú solo grabas el scroll.")]),

"2026-10-27": dict(
  beats=[
    b("GANCHO", C, "Tengo [X] minutos para construir una app que funcione, solo con IA. Empieza el reloj.",
      hace="Muestras el cronómetro del celular a cámara y lo inicias en «empieza el reloj»."),
    b("LA IDEA", P, "La app: [idea simple y útil, ej. un cotizador para tu negocio].",
      ve="Pantalla: escribes el primer pedido a la IA. Graba la pantalla TODO el proceso, de corrido; yo elijo los momentos."),
    b("PROBLEMA", C, "Okay, esto se rompió. [Di qué pasó de verdad.]",
      hace="Grábalo en el momento real en que falla, con el celular apoyado al lado del monitor. Frustración real.", plano="Cerca, desde el lado del monitor"),
    b("FINAL", C, "Quedan [X] minutos… y funciona. Mira.",
      hace="Grábalo cuando funcione. En «mira» giras el celular hacia la pantalla."),
    b("DEMO", E, "(usas la app en el celular 5 segundos, sin hablar)",
      ve="La app final usándose en el celular, grabada con otro teléfono o con grabación de pantalla."),
    b("CIERRE", C, "¿Qué app hago la próxima vez? Te leo.",
      hace="Relajado, te echas hacia atrás en la silla."),
  ],
  broll=[],
  recursos=[r("Grabación de pantalla completa del proceso", "Desde que escribes el primer pedido hasta que funciona. Aunque dure 40 minutos: yo la acelero."),
            r("Los minutos reales", "Cuánto te diste y cuánto te sobró, para el cronómetro.")]),

"2026-10-28": dict(
  beats=[
    b("GANCHO", C, "Mismo video, misma oferta, tres primeras frases distintas. Una funcionó y las otras no.",
      hace="Cuentas uno, dos, tres con los dedos en «tres primeras frases»."),
    b("EL ERROR", C, "El error de casi todos: hablar del producto. Al cliente no le duele tu producto, le duele la plata.",
      hace="Te tocas el bolsillo en «le duele la plata».", plano="Un poco más cerca"),
    b("EJEMPLO", P, "En vez de «Te presento el producto X», di el dolor: [ejemplo real, sin nombrar al cliente].",
      ve="Los 3 anuncios del ejemplo uno tras otro, solo los primeros 3 segundos de cada uno."),
    b("LA REGLA", C, "Graba siempre tres ganchos para cada video y deja que el algoritmo elija.",
      hace="Tranquilo, lo dices lento, como un consejo."),
    b("CIERRE", C, "Comenta «gancho» y te digo cuál pondría en el tuyo.",
      hace="Apuntas abajo, a los comentarios."),
  ],
  broll=[],
  recursos=[r("Los 3 anuncios del ejemplo (videos)", "Los archivos originales o descargados de la Biblioteca de anuncios. Anonimizo marca y datos."),
            r("Cuál ganó y por cuánto", "Un número simple: costo por venta o por lead de cada uno.")]),

"2026-10-29": dict(
  beats=[
    b("GANCHO", C, "Le hablé en chileno a una inteligencia artificial. No entendió nada.",
      hace="Cara de decepción. Te encoges de hombros al final."),
    b("PRUEBA 1", P, "«Oye, ¿cachai que el pololo de la Javi llegó al tiro a la once?»",
      ve="Grabación de pantalla mientras dictas la frase a la IA, en vivo (que se oiga tu voz). Graba la pantalla con audio del micrófono."),
    b("RESULTADO", C, "(lee en voz alta lo que escribió la IA, totalmente serio)",
      hace="Lees lo que salió, sin reírte. Si te ríes, mejor: igual lo grabas."),
    b("PRUEBA 2", P, "(dicta otra frase más difícil: «po», «fome», «al lote», «la raja»)",
      ve="Igual que la prueba 1: grabación de pantalla con el dictado y la respuesta."),
    b("CIERRE", C, "Dame una frase en chileno que la IA no entienda. La pruebo en el próximo video.",
      hace="Media sonrisa, mirando al lente."),
  ],
  broll=[],
  recursos=[r("La grabación de pantalla con audio", "En el Mac: Cmd+Shift+5 → Opciones → Micrófono. Así queda tu voz y lo que escribe la IA juntos.")]),

"2026-10-30": dict(
  beats=[
    b("GANCHO", C, "Es fin de mes y estos son los únicos tres números que miro de una campaña.",
      hace="De pie. Levantas tres dedos.", plano="Medio, de pie, con espacio a tu lado para los números"),
    b("UNO", C, "Uno: cuánto me cuesta cada venta. No cada clic: cada venta.",
      hace="Escribes «$ por venta» en la pizarra o la hoja mientras lo dices (o lo haces en el aire, yo lo dibujo)."),
    b("DOS", C, "Dos: cuánto puedo pagar por venta sin perder plata. Mi CPA de equilibrio.",
      hace="Escribes el segundo número al lado."),
    b("TRES", C, "Tres: si el primero es menor que el segundo, subo el presupuesto. Si no, cambio el anuncio, no la plata.",
      hace="Dibujas «<» entre los dos. En «cambio el anuncio» niegas con la cabeza."),
    b("CIERRE", C, "Guárdalo para tu próximo fin de mes.",
      hace="Haces el gesto de guardar (tocas la esquina de la pantalla)."),
  ],
  broll=["La pizarra o la hoja terminada, de cerca (5 s)"],
  recursos=[]),

"2026-10-31": dict(
  beats=[
    b("GANCHO", C, "Feliz Halloween. Estas son las cosas que de verdad le dan miedo a un marketero.",
      hace="Linterna desde abajo, voz baja y lenta. Entras a cuadro desde la oscuridad."),
    b("CINCO", C, "Cinco: «después vemos el presupuesto».",
      hace="Susurrado. Pausa de un segundo después."),
    b("CUATRO", C, "Cuatro: el píxel que dejó de funcionar un viernes en la noche.",
      hace="Miras a un lado como si escucharas un ruido."),
    b("TRES", C, "Tres: «Aprendizaje limitado».",
      hace="Muestras el cartel «Aprendizaje limitado» a cámara (si lo hiciste)."),
    b("DOS", C, "Dos: un cliente que pide «hazlo viral».",
      hace="Te tapas la boca de terror."),
    b("UNO", C, "Y uno… «¿Lo podemos ver en una llamada rapidita?»",
      hace="Después de «y uno…» pausa larga. Lo dices y APAGAS la linterna. Quédate 2 s en negro."),
  ],
  broll=["2 s de pieza oscura sin ti (para el susto final)"],
  recursos=[]),

"2026-11-01": dict(
  beats=[
    b("GANCHO", C, "Este error casi nos cuesta un cliente, y fue culpa mía.",
      hace="Sentado, cerca, tono bajo. Miras abajo un segundo antes de «y fue culpa mía».", plano="Primer plano, sentado"),
    b("CONTEXTO", V, "[Qué estaban haciendo, sin nombrar al cliente.]",
      ve="Tú mirando por la ventana o caminando, en silencio (8–10 s)."),
    b("EL ERROR", C, "[Qué pasó exactamente.]",
      hace="Lo cuentas como a un amigo. No leas: mira el teleprompter solo para acordarte."),
    b("CÓMO LO ARREGLAMOS", V, "[Qué hiciste después.]",
      ve="Tus manos escribiendo en el computador, de cerca (5–8 s), y una toma de la oficina o del escritorio."),
    b("LECCIÓN", C, "[La regla que te dejó, en una frase.]",
      hace="Mirada fija al lente. Te quedas 1 s en silencio al terminar."),
  ],
  broll=[],
  recursos=[r("La historia en 4 líneas", "Escríbela en la nota antes de grabar (contexto, error, arreglo, lección) y la dejo como guion exacto.")]),

"2026-11-02": dict(
  beats=[
    b("GANCHO", C, "Esta página la hizo una IA en 30 segundos. Y se nota.",
      hace="Apuntas a un lado (ahí va la página). Cara de «mmm» en «y se nota»."),
    b("GENERANDO", E, "(la IA generando la página, acelerado)",
      ve="Grabación de pantalla: le pides una landing a cualquier IA y se genera. De corrido, sin cortar."),
    b("SEÑALES", P, "Las señales: [las 3 que más ves, ej. degradado morado, tarjetas con borde, «Desbloquea tu potencial»].",
      ve="Scroll lento por la página generada. Pasa el mouse sobre cada señal mientras la nombras."),
    b("ARREGLO", P, "Lo que cambio yo: [tus 2–3 arreglos].",
      ve="Grabación de pantalla haciendo los cambios (se acelera)."),
    b("ANTES/DESPUÉS", V, "Mira la diferencia.",
      ve="Scroll lento de tu versión corregida (10 s)."),
    b("CIERRE", C, "La IA hace el 80%. El 20% que vende lo pones tú.",
      hace="Apuntas a cámara en «tú»."),
  ],
  broll=[],
  recursos=[r("La página generada y tu versión", "El enlace o los archivos, por si necesito capturas en alta.")]),

"2026-11-03": dict(
  beats=[
    b("GANCHO", C, "Vi tres anuncios esta semana que me dieron envidia. Les robaría la idea.",
      hace="Mirada cómplice al lente, media sonrisa en «les robaría»."),
    b("UNO", P, "Uno: [marca]. Lo bueno: [qué truco usa].",
      ve="El anuncio 1 corriendo (5–8 s)."),
    b("DOS", P, "Dos: [marca]. [Truco.]",
      ve="El anuncio 2 corriendo (5–8 s)."),
    b("TRES", P, "Tres: [marca]. [Truco.]",
      ve="El anuncio 3 corriendo (5–8 s)."),
    b("CIERRE", C, "Todos tienen lo mismo: [patrón en común]. Úsalo.",
      hace="Cuentas con los dedos los tres y cierras el puño en «úsalo»."),
  ],
  broll=[],
  recursos=[r("Los 3 anuncios (video)", "Graba la pantalla de cada uno desde la Biblioteca de anuncios de Meta, o mándame los enlaces y los bajo yo."),
            r("Marca y truco de cada uno", "Una línea por anuncio, en la nota.")]),

"2026-11-04": dict(
  beats=[
    b("GANCHO", C, "Mientras duermo, una IA trabaja para mí. Esto es lo que hace.",
      hace="Recién despierto, en la cama o con el café. Lo dices medio dormido.", plano="Cerca, luz de mañana"),
    b("UNO", P, "Lunes, miércoles y viernes arma el informe de anuncios de un cliente y lo deja listo en PDF.",
      ve="El PDF del informe abriéndose y un scroll lento (lo difumino)."),
    b("DOS", P, "[Otra automatización real.]",
      ve="Pantalla de esa automatización funcionando o su resultado (5–8 s)."),
    b("TRES", P, "[Otra.]",
      ve="Pantalla de la tercera (5–8 s)."),
    b("CIERRE", C, "No es magia: son tareas repetidas que alguien tenía que hacer igual.",
      hace="Ya despierto, tomando café, tranquilo."),
  ],
  broll=["Despertador sonando (de cerca, 3 s)", "El café sirviéndose (3 s)"],
  recursos=[r("El informe en PDF", "Cualquiera de los automáticos. Lo difumino entero, solo se ve que existe."),
            r("Las otras 2 automatizaciones", "Nombre y qué hacen, en la nota. Si no tienes captura, te digo cuál grabar.")]),

"2026-11-05": dict(
  beats=[
    b("JEFE", C, "«Oye, ¿le puedes pedir a la IA que haga la presentación del directorio? Es para en una hora».",
      hace="JEFE: corbata, apurado, mirando un poco a la izquierda del lente (te habla a ti)."),
    b("CONTADORA", C, "«¿La IA puede hacer el balance? Pero que no se equivoque».",
      hace="CONTADORA: lentes en la punta de la nariz, desconfiada."),
    b("PRACTICANTE", C, "«Ya le pedí todo a la IA, ¿por qué me sale en inglés?»",
      hace="PRACTICANTE: audífonos al cuello, mostrando el celular confundido."),
    b("TÚ", E, "(cara de cansancio a cámara, 2 segundos)",
      hace="Tú normal, mirando directo al lente, inmóvil.", plano="Directo al lente"),
    b("JEFE", C, "«Y de paso, ¿le preguntas si me pueden subir el sueldo?»",
      hace="JEFE: vuelve a entrar a cuadro, lo dice y se va."),
  ],
  broll=[],
  recursos=[]),

"2026-11-06": dict(
  beats=[
    b("GANCHO", C, "No le subas el presupuesto a tu anuncio hasta revisar estas tres cosas.",
      hace="Mano levantada como «alto» al decir «no le subas»."),
    b("UNO", C, "Uno: la oferta. Si el precio no es atractivo, más gente va a ignorarlo más rápido.",
      hace="Un dedo. Tono de advertencia."),
    b("DOS", C, "Dos: los primeros tres segundos. Si nadie se queda, no hay nada que escalar.",
      hace="Dos dedos. Pausa corta después de «tres segundos»."),
    b("TRES", P, "Tres: la página a la que llegan. Si no carga rápido en el celular, pierdes la venta igual.",
      ve="Grabación de pantalla del celular abriendo una página lenta (se queda en blanco 3–4 s)."),
    b("CIERRE", C, "Arregla eso y después escala.",
      hace="Firme. Asientes una vez al final."),
  ],
  broll=["Pantalla del Administrador de anuncios con el campo de presupuesto (sin datos de cliente, 5 s)"],
  recursos=[]),

"2026-11-07": dict(
  beats=[
    b("GANCHO", C, "No es el color, ni el logo. Lo que hace que una app se sienta cara es cómo se mueve.",
      hace="Niegas con el dedo en «no es el color, ni el logo». Muestras el celular en «cómo se mueve»."),
    b("EJEMPLO", P, "Mira cómo abre esta ventana: no aparece, llega. Tiene peso.",
      ve="Grabación de pantalla del iPhone abriendo y cerrando apps de Apple (Ajustes, Fotos). Lento, 10 s."),
    b("CONTRASTE", P, "Ahora mira esta otra: aparece de golpe. Se siente barata y no sabes por qué.",
      ve="Grabación de pantalla de una app o web sin animación (cualquiera que abra «de golpe»)."),
    b("EL SECRETO", C, "Se llama animación con resorte: todo lo que se mueve tiene masa, como en la vida real.",
      hace="Dejas caer un objeto (una goma, un lápiz) en la mano en «tiene masa»."),
    b("CIERRE", C, "Si diseñas algo, que se mueva como un objeto, no como una diapositiva.",
      hace="Mirada al lente, tranquilo."),
  ],
  broll=[],
  recursos=[]),

"2026-11-08": dict(
  beats=[
    b("GANCHO", C, "Trabajo con dos computadores al mismo tiempo, y comparten el mismo cerebro.",
      hace="Sentado entre los dos; apuntas a uno y al otro.", plano="General, que se vean los dos equipos"),
    b("EL PC", V, "El PC es para todo: edición pesada, experimentos.",
      ve="Detalles del PC: pantalla encendiéndose, teclado, tu mano en el mouse (3 clips de 3 s)."),
    b("EL MAC", V, "El Mac es solo trabajo. Nada personal, nada de juegos.",
      ve="Detalles del Mac: abriéndolo, pantalla, de cerca (3 clips)."),
    b("EL CEREBRO", P, "Y lo que aprendo en uno lo sabe el otro: todo queda en un cerebro de notas sincronizado.",
      ve="Obsidian con el grafo moviéndose (10–15 s; mueve el grafo con el mouse)."),
    b("CIERRE", C, "¿Equipo Mac o equipo PC?",
      hace="Levantas una mano por cada uno, como balanza."),
  ],
  broll=["Plano general del escritorio con la lámpara cálida encendida (5 s, sin ti)"],
  recursos=[]),

"2026-11-09": dict(
  beats=[
    b("GANCHO", C, "Hice un bot que vende por WhatsApp y empezó a inventar precios.",
      hace="Te pasas la mano por la cara en «inventar precios»."),
    b("QUÉ PASÓ", V, "[Cuenta el caso real, sin nombrar al cliente.]",
      ve="El chat de ejemplo con el precio inventado (lo armo yo; tú solo cuéntame el caso)."),
    b("POR QUÉ", C, "El bot no sabía los precios, entonces los adivinaba. Una IA nunca dice «no sé» si no se lo enseñas.",
      hace="Explicando, con las manos abiertas."),
    b("ARREGLO", P, "La regla: los precios van escritos en las instrucciones del bot, y cada vez que cambia un precio, se revisa todo.",
      ve="Pantalla con las instrucciones de un bot (difuminado) donde se vea una lista de precios."),
    b("CIERRE", C, "Un bot sin reglas es un vendedor sin jefe.",
      hace="Seco, mirando al lente."),
  ],
  broll=[],
  recursos=[r("El caso en 3 líneas", "Qué preguntó el cliente, qué precio inventó el bot y cuál era el real.")]),

"2026-11-10": dict(
  beats=[
    b("GANCHO", C, "Este anuncio es feo y vendió muchísimo más que este, que es precioso.",
      hace="Apuntas a un lado en «este» y al otro lado en «este, que es precioso»."),
    b("POR QUÉ", P, "El feo dice el precio en el primer segundo. El bonito te cuenta una historia que nadie pidió.",
      ve="Los primeros 3 segundos de cada anuncio, uno después del otro."),
    b("LA REGLA", C, "En productos baratos, el precio ES el gancho.",
      hace="Lo dices lento, marcando «ES» con la voz, no con volumen."),
    b("CUÁNDO NO", C, "En productos caros es al revés: primero confianza, después precio.",
      hace="Das vuelta la mano en «al revés»."),
    b("CIERRE", C, "¿Qué vendes tú? Te digo cuál te conviene.",
      hace="Apuntas al lente."),
  ],
  broll=[],
  recursos=[r("Los dos anuncios (video o imagen)", "Con sus resultados (ventas o costo por venta). Anonimizo marca."),
            r("Permiso del cliente", "Si no hay permiso, igual mándalos: los difumino y no se ve la marca.")]),

"2026-11-11": dict(
  beats=[
    b("GANCHO", C, "Le pedí a una inteligencia artificial que hiciera un comercial chileno de los noventa.",
      hace="Ropa noventera si tienes. Tranquilo, con media sonrisa."),
    b("EL PEDIDO", P, "Le dije: [lee el pedido que le hiciste].",
      ve="Grabación de pantalla escribiendo el pedido a la IA."),
    b("RESULTADO", E, "(reacción real mientras se ve el comercial)",
      hace="Ves el comercial por PRIMERA vez con la cámara grabándote. No lo veas antes.", plano="Cerca, la cara iluminada por la pantalla"),
    b("VEREDICTO", C, "Nota: [de 1 a 7].",
      hace="Muestras la nota con los dedos."),
    b("CIERRE", C, "¿Qué comercial le pido la próxima vez?",
      hace="Relajado, de vuelta al tono normal."),
  ],
  broll=[],
  recursos=[r("El comercial generado", "El video o las imágenes tal como salieron de la IA."),
            r("El pedido exacto que le hiciste", "Copiado en la nota.")]),

"2026-11-12": dict(
  beats=[
    b("GANCHO", C, "Mismo logo, mismo color. Solo cambié la letra. ¿Cuál cobra más caro?",
      hace="Apuntas al lado (ahí van las 3 tarjetas)."),
    b("PAUSA", C, "Piénsalo. Tres segundos.",
      hace="Te quedas en silencio 3 s con cara de suspenso, tamborileando los dedos.", seg=4),
    b("RESPUESTA", C, "La [número]. [Por qué, en una frase.]",
      hace="Levantas el número con los dedos."),
    b("CIERRE", C, "La letra habla antes que tú.",
      hace="Mirada al lente, sin moverte."),
  ],
  broll=[],
  recursos=[r("Las 3 versiones de la marca", "Si no tienes tiempo, las diseño yo y te mando cuál es la ganadora antes de que grabes.")]),

"2026-11-13": dict(
  beats=[
    b("GANCHO", C, "Es viernes 13, así que te voy a contar la peor historia de terror que he vivido en una agencia.",
      hace="Igual que Halloween: linterna desde abajo, voz baja."),
    b("LA HISTORIA", C, "[Historia real: el archivo que se borró, el lanzamiento que se cayó, el cliente a las 3 a. m.]",
      hace="Cuéntala lento, mirando al lente. Linterna temblando un poco."),
    b("EL GIRO", C, "[El peor momento.]",
      hace="Te acercas al lente en el peor momento.", plano="Muy cerca"),
    b("CIERRE", C, "Cuéntame la tuya. La peor la leo en el próximo video.",
      hace="Apagas la linterna al terminar."),
  ],
  broll=["Pantalla de computador en la oscuridad con un error o un archivo que no abre (5 s)"],
  recursos=[r("La historia en 3 líneas", "Escríbela en la nota y la dejo armada como guion.")]),

"2026-11-14": dict(
  beats=[
    b("GANCHO", C, "La inteligencia artificial no te va a quitar la pega. El que sabe usarla, sí.",
      hace="Cerca, firme, sin moverte. Pausa entre las dos frases.", plano="Primer plano, luz de lado"),
    b("EJEMPLO", P, "[Algo que antes te tomaba X horas y ahora toma minutos, real.]",
      ve="La pantalla de esa tarea haciéndose con IA (10 s)."),
    b("LA REALIDAD", C, "Y quien no la usa sigue demorando horas. ¿A quién contratarías tú?",
      hace="Ceja levantada en la pregunta."),
    b("LA SALIDA", C, "Lo bueno: aprender a usarla toma semanas, no años.",
      hace="Te relajas, media sonrisa."),
    b("CIERRE", C, "¿Estás de acuerdo o no? Te leo.",
      hace="Te cruzas de brazos."),
  ],
  broll=[],
  recursos=[r("El ejemplo real y sus números", "Qué tarea, cuánto tomaba antes y cuánto ahora.")]),

"2026-11-15": dict(
  beats=[
    b("GANCHO", C, "Nuestra empresa se llama Cóndor, y no es por lo que crees.",
      hace="Afuera, con cerro o cielo detrás. Caminando lento hacia la cámara.", plano="Medio, exterior"),
    b("ORIGEN", V, "[Cómo nació el nombre, la historia real.]",
      ve="Cielo y cordillera (3–4 clips lentos de 5 s, celular quieto o paneo lento)."),
    b("QUÉ SIGNIFICA", V, "[Qué representa hoy para el equipo.]",
      ve="El equipo trabajando (si se puede) o tu escritorio con el logo en pantalla."),
    b("CIERRE", C, "[Frase de misión, corta.]",
      hace="Quieto, mirando al lente, viento si hay. 2 s en silencio al terminar."),
  ],
  broll=[],
  recursos=[r("El logo de Cóndor en alta (PNG o SVG)"),
            r("La historia del nombre", "Escríbela en la nota y armo el texto exacto.")]),

"2026-11-16": dict(
  beats=[
    b("GANCHO", C, "Así pruebo tres anuncios distintos grabando un solo video.",
      hace="Levantas tres dedos y después uno."),
    b("EL TRUCO", C, "Grabo el cuerpo una vez, y tres comienzos distintos.",
      hace="Con las manos: «cuerpo» abajo, «tres comienzos» arriba."),
    b("CÓMO", P, "Pego cada comienzo al mismo cuerpo, y subo los tres al mismo conjunto de anuncios.",
      ve="Una línea de tiempo de edición con 3 cabezas y 1 cuerpo (la grabo yo desde la edición de este mismo video)."),
    b("RESULTADO", C, "Meta le da más plata al que funciona. Yo solo miro cuál ganó.",
      hace="Te echas hacia atrás con los brazos detrás de la cabeza."),
    b("CIERRE", C, "Un video, tres pruebas. Guárdalo.",
      hace="Gesto de guardar."),
  ],
  broll=[],
  recursos=[]),

"2026-11-17": dict(
  beats=[
    b("GANCHO", C, "Me dejaste tu página en los comentarios. La rediseñé.",
      hace="Muestras el celular con el comentario hacia cámara."),
    b("ANTES", P, "Así estaba: [qué le fallaba, con respeto].",
      ve="Scroll lento de la página original (10 s)."),
    b("PROCESO", P, "(cámara rápida, narra 2–3 decisiones)",
      ve="Grabación de pantalla de TODO el rediseño. La acelero yo."),
    b("DESPUÉS", V, "Y así quedó.",
      ve="Scroll lento del rediseño terminado (10 s)."),
    b("CIERRE", C, "Déjame la tuya. Elijo otra la próxima semana.",
      hace="Apuntas abajo, a los comentarios."),
  ],
  broll=[],
  recursos=[r("El comentario del seguidor (captura)"),
            r("La página original y el rediseño", "Enlaces o archivos.")]),

"2026-11-18": dict(
  beats=[
    b("GANCHO", C, "Mi inteligencia artificial se acuerda de todo lo que hemos trabajado juntos. Te muestro cómo.",
      hace="Luz baja, la pantalla te ilumina. Te giras hacia el Mac en «te muestro»."),
    b("EL CEREBRO", P, "Cada cosa que aprendemos queda escrita en una nota. Esto de acá son cientos de notas conectadas.",
      ve="Grafo de Obsidian girando y haciendo zoom (15 s, moviendo el mouse lento)."),
    b("LOS ERRORES", P, "Incluso tiene una lista de sus propios errores, para no repetirlos.",
      ve="Scroll por la nota de errores (sin datos sensibles; la difumino igual)."),
    b("EL RESULTADO", C, "Así no le explico lo mismo dos veces. Llega y sabe.",
      hace="Pausa antes de «llega y sabe»."),
    b("CIERRE", C, "¿Quieres que te muestre cómo armarlo?",
      hace="Ceja levantada."),
  ],
  broll=[],
  recursos=[]),

"2026-11-19": dict(
  beats=[
    b("GANCHO", C, "Lo que la gente cree que hace un COO… y lo que hago de verdad.",
      hace="Normal, a cámara. Pausa en «…»."),
    b("MITO 1", E, "(firmando papeles con un café caro)",
      hace="Con chaqueta, firmando con estilo, tomando un sorbo lento.", plano="Luz dramática de lado", seg=3),
    b("REALIDAD 1", E, "(respondiendo 40 WhatsApps a la vez)",
      hace="Con polerón, dos celulares, escribiendo rápido, estresado.", plano="Luz normal", seg=3),
    b("MITO 2", E, "(dando un discurso)",
      hace="Con chaqueta, de pie, gesticulando como en una charla TED.", plano="Luz dramática", seg=3),
    b("REALIDAD 2", E, "(arreglando un píxel a la 1 a. m.)",
      hace="Con polerón, de noche, la cara pegada a la pantalla.", plano="Solo la luz de la pantalla", seg=3),
    b("CIERRE", C, "Y no lo cambiaría.",
      hace="Con polerón, sonrisa honesta a cámara."),
  ],
  broll=[],
  recursos=[]),

"2026-11-20": dict(
  beats=[
    b("GANCHO", C, "Hace 30 días dije que iba a subir un video diario editado por una IA. Esto pasó.",
      hace="Exactamente como el día 1: mismo lugar, ropa, plano y gesto de entrada.", plano="Igual al día 1"),
    b("NÚMEROS", P, "[Seguidores antes y después, vistas totales, el video que más funcionó: números REALES.]",
      ve="Grabación de pantalla de las estadísticas de TikTok e Instagram (scroll lento)."),
    b("LO QUE APRENDÍ", C, "[2 aprendizajes reales.]",
      hace="Honesto, conversado."),
    b("LO QUE NO FUNCIONÓ", C, "[1 cosa honesta.]",
      hace="Te ríes de ti mismo."),
    b("CIERRE", C, "¿Sigo otros 30?",
      hace="Levantas los hombros, mirando al lente. 1 s quieto al final."),
  ],
  broll=[],
  recursos=[r("Capturas de estadísticas de TikTok e Instagram", "Seguidores, vistas totales y el top 3 de videos."),
            r("Los números en texto", "En la nota, para animarlos exactos.")]),
}

# 22-oct: Max ya no es COO de Cóndor; si se presenta por una empresa, es por Optimizo (ver cerebro/01 Quién es Max hoy.md).
G["2026-10-22"]["beats"][1] = b("QUIÉN", C, "Soy Max, cofundador de Optimizo. Armamos sistemas para que una empresa venda más con menos.",
    hace="Tranquilo, mirando al lente. Un gesto con la mano hacia el Mac de atrás en «inteligencia artificial».", plano="Mismo plano (yo lo acerco en edición)")
G["2026-10-23"]["beats"][0] = b("GANCHO", C, "Le entregué mi trabajo a una IA por un día completo. Esto es lo que rompió.",
    hace="Serio, como confesando. Pausa breve antes de «esto es lo que rompió».")
G["2026-10-23"]["beats"][-1] = b("CONCLUSIÓN", C, "La IA no hizo mi trabajo. Hizo la parte que yo odiaba, y me dejó el resto.",
    hace="Firme, mirando al lente. Media sonrisa en «el resto».")
G["2026-10-25"]["beats"][0] = b("GANCHO", C, "Así es un día real construyendo con inteligencia artificial.",
    hace="Grábalo en la mañana con el café en la mano, recién llegando. Caminando hacia el celular si puedes.")
G["2026-10-25"]["beats"][2] = b("MEDIODÍA", V, "Después, reuniones: qué le duele a cada empresa y qué sistema le armamos.",
    ve="Tú en una reunión (desde atrás o de lado, sin pantallas con datos), una libreta, el reloj (3 clips).")
G["2026-10-25"]["beats"][3] = b("TARDE", V, "En la tarde construyo: sitios, apps, bots. Lo que se ve y lo que trabaja solo.",
    ve="Pantalla con un diseño o un bot en curso, tu mano en el mouse, un detalle de la pantalla de cerca (3 clips).")
G["2026-11-13"]["beats"][0] = b("GANCHO", C, "Es viernes 13, así que te voy a contar la peor historia de terror que he vivido trabajando.",
    hace="Igual que Halloween: linterna desde abajo, voz baja.")
G["2026-11-15"] = dict(
  beats=[
    b("GANCHO", C, "El logo de Optimizo tiene un punto que se escapa. Y no es un error de diseño.",
      hace="Apuntas al lado (ahí aparece el logo). Pausa antes de «y no es un error».", plano="Medio, con aire a tu lado para el logo"),
    b("EL LOGO", P, "[Cómo nació el nombre y el logo, la historia real.]",
      ve="El logo de Optimizo en la pantalla del Mac, grabado de cerca con el celular (10 s, acercándote lento)."),
    b("QUÉ SIGNIFICA", V, "Todo proceso tiene una salida. Nuestro trabajo es encontrarla.",
      ve="Tus manos dibujando un círculo con un punto afuera en una hoja (5–8 s, desde arriba)."),
    b("CIERRE", C, "Si en tu empresa hay un proceso que no tiene salida, cuéntamelo.",
      hace="Quieto, mirando al lente. 1 s en silencio al terminar."),
  ],
  broll=["La hoja con el dibujo terminado, desde arriba (3 s)"],
  recursos=[r("El logo de Optimizo en SVG o PNG grande"),
            r("La historia del nombre y del punto", "Escríbela en la nota y armo el texto exacto."),
            r("OK de los socios para mostrar la marca", "Si todavía no se puede, cambio este video por otro del banco de ideas.")])
G["2026-11-19"] = dict(
  beats=[
    b("GANCHO", C, "Lo que la gente cree que hago con inteligencia artificial… y lo que hago de verdad.",
      hace="Normal, a cámara. Pausa en «…»."),
    b("MITO 1", E, "(le das un clic a un botón y te tiras a descansar con lentes de sol)",
      hace="Con lentes de sol, un clic exagerado al mouse y te echas para atrás con los brazos detrás de la cabeza.", plano="Luz dramática de lado", seg=3),
    b("REALIDAD 1", E, "(corrigiendo a la IA por décima vez, a las 11 de la noche)",
      hace="Con polerón, escribiendo rápido, te agarras la cabeza.", plano="Luz normal", seg=3),
    b("MITO 2", E, "(le hablas al computador como en una película y todo se arma solo)",
      hace="De pie, chasqueas los dedos hacia la pantalla con cara de genio.", plano="Luz dramática", seg=3),
    b("REALIDAD 2", E, "(leyendo un error larguísimo con el café ya frío)",
      hace="De noche, la cara pegada a la pantalla, tomas el café y pones cara de asco.", plano="Solo la luz de la pantalla", seg=3),
    b("CIERRE", C, "Y no lo cambiaría.",
      hace="Con polerón, sonrisa honesta a cámara."),
  ],
  broll=[],
  recursos=[])

AJUSTES = {
  "2026-10-23": dict(titulo="Le di mi trabajo a una IA por un día", datos=dict(
    ganchos_alt=["Hoy no trabajé yo. Trabajó una IA, y casi la despido.", "Le pasé mi pega a una IA por 24 horas."],
    origen="objeto (tu propio trabajo como experimento)",
    post={"texto": "Día 2/30. Le di mi trabajo a una IA. Lo que rompió me sorprendió.", "hashtags": ["#ia", "#productividad", "#trabajo", "#reto30dias", "#chatgpt"], "sonido": "Tendencia de la semana"})),
  "2026-10-25": dict(titulo="Un día construyendo con IA, en 60 segundos", datos=dict(
    ganchos_alt=["Nadie entiende qué hago. Así que te muestro mi día.", "Mi día empieza con 47 mensajes sin leer."],
    por_que="«Un día en la vida» es un formato probado: curiosidad por un trabajo que pocos entienden. 20 tomas cortas dan ritmo solo.",
    post={"texto": "Un día real construyendo con IA. ¿Qué parte te sorprendió? Día 4/30.", "hashtags": ["#diaenlavida", "#ia", "#emprendimiento", "#automatizacion", "#reto30dias"], "sonido": "Canción en tendencia ~120 BPM (te digo cuál y desde qué segundo)"})),
  "2026-11-10": dict(datos=dict(
    por_que="Contradice lo que todos creen (lo bonito vende). Es un aprendizaje real de un e-commerce: el video con el precio fue el que vendió.")),
  "2026-11-13": dict(titulo="Viernes 13: mi peor historia de terror trabajando", datos=dict(
    post={"texto": "Cuéntame la tuya 👻 Día 23/30.", "hashtags": ["#viernes13", "#terror", "#trabajo", "#marketing", "#storytime"], "sonido": "Terror en tendencia"})),
  "2026-11-15": dict(titulo="El punto que se escapa: por qué el logo de Optimizo es así", formato="Historia de marca", datos=dict(
    por_que="La historia detrás de un detalle de diseño engancha más que «quiénes somos». Muestra cómo piensas el diseño y presenta Optimizo sin vender.",
    origen="objeto (el punto del logo)",
    ganchos_alt=["Este punto vale más que todo el resto del logo.", "Le pusimos un error a propósito a nuestro logo."],
    grabar={"plano": "A cámara, tranquilo, con aire a un lado", "lugar": "Escritorio con el logo en la pantalla del Mac", "luz": "Cálida, de lado", "ropa": "Normal"},
    edicion={"estilo": "Diseño en vivo: el disco del logo se dibuja detrás de ti y el punto se escapa con física (rebota y se acomoda). Fondo claro, tono hueso.", "subtitulos": "Elegantes, abajo, palabra clave en el teal de Optimizo", "musica": "Minimalista y cálida, 80–90 BPM", "efectos": ["Pop suave cuando el punto se escapa", "Trazo de lápiz mientras se dibuja el círculo", "Silencio de medio segundo antes de «y no es un error»"], "ritmo": "Pausado, un elemento por frase"},
    post={"texto": "Todo proceso tiene una salida. Día 25/30.", "hashtags": ["#diseño", "#branding", "#logo", "#emprendimiento", "#reto30dias"], "sonido": "Instrumental cálido en tendencia"})),
  "2026-11-19": dict(titulo="Lo que la gente cree que hago con IA vs. lo que hago", datos=dict(
    por_que="Formato de contraste rápido y repetible. Humaniza el trabajo con IA y desarma la idea de que «se hace solo».",
    ganchos_alt=["Lo que mi mamá cree que hago vs. lo que hago.", "Trabajar con IA: expectativa vs. realidad."],
    grabar={"plano": "Parejas de tomas: MITO (exagerado, elegante) y REALIDAD (tú real)", "lugar": "Escritorio", "luz": "MITO: dramática; REALIDAD: normal", "ropa": "MITO: lentes de sol y chaqueta; REALIDAD: polerón"},
    props=["Lentes de sol", "Chaqueta", "Una taza de café"],
    post={"texto": "¿Cuál es tu mito vs. realidad? Día 29/30.", "hashtags": ["#inteligenciaartificial", "#expectativavsrealidad", "#humor", "#trabajo", "#reto30dias"], "sonido": "Canción viral de contraste"})),
}


# 22-oct (Max): ideas propias reemplazan dos videos que se repetían (6-nov ≈ 30-oct; 16-nov ≈ 28-oct).
NUEVOS = {
  "2026-11-06": dict(pilar="ia", formato="Demostración con pantalla", titulo="Hice este video con IA en 3 minutos",
    datos=dict(
      origen="objeto (la herramienta nueva)",
      por_que="Asombro: «¿eso se puede hacer ya?». Y honestidad: mostrar lo que todavía no sale bien lo hace creíble.",
      ganchos_alt=["Tres minutos. Eso me demoré en hacer este video.", "Ningún humano grabó lo que vas a ver."],
      duracion="40–60 s",
      grabar={"plano": "Medio, sentado frente al computador, la pantalla iluminándote", "lugar": "Escritorio", "luz": "Baja, que la pantalla te ilumine la cara", "ropa": "Normal"},
      beats=[
        b("GANCHO", C, "Este video lo hice con inteligencia artificial en tres minutos. Bueno, casi todo.",
          hace="Tranquilo, de lado al computador; giras la cara al lente en «tres minutos». Media sonrisa en «casi todo».", plano="Medio, pantalla encendida a tu lado"),
        b("EL PEDIDO", P, "Le escribí lo que quería: [lo que le pediste, en una frase].",
          ve="Grabación de pantalla escribiendo el pedido en la herramienta (sin acelerar, 10–15 s)."),
        b("ESPERA", E, "(el video generándose, mientras miras la pantalla)",
          hace="Te quedas mirando la pantalla con el café en la mano, sin hablar.", ve="Grabación de pantalla del progreso (la acelero yo)."),
        b("LO QUE SALIÓ", P, "(el resultado, 5–8 segundos, sin hablar)",
          ve="El video generado, grabado en el celular o exportado tal cual."),
        b("LO BUENO", C, "Lo que me sorprendió: [lo que salió bien].",
          hace="Honesto, mirando al lente."),
        b("LO QUE FALTA", V, "Lo que todavía se nota: [lo que delata que es IA].",
          ve="El detalle raro del video generado, de cerca (manos, texto, movimiento)."),
        b("CIERRE", C, "La herramienta ya no es lo difícil. Lo difícil es saber qué pedirle.",
          hace="Lento, mirando al lente. 1 s quieto al final."),
      ],
      broll=["Tus manos en el teclado con la luz de la pantalla (5 s, 60 fps)"],
      recursos=[r("El video que generó la IA", "El archivo original, sin comprimir."),
                r("Qué herramienta usaste y el pedido exacto", "En la nota."),
                r("Cuánto demoró de verdad", "Desde que escribiste hasta que lo tuviste. Si fueron 5 minutos, decimos 5.")],
      props=["Café"],
      edicion={"estilo": "Cinematográfico de noche: tú iluminado por la pantalla, la generación acelerada con un contador de tiempo elegante, y el resultado a pantalla completa como estreno.", "subtitulos": "Limpios, abajo; «3 minutos» grande una sola vez", "musica": "Electrónica suave que crece hasta el resultado y se corta en seco para «lo que falta»", "efectos": ["Teclas suaves al escribir el pedido", "Aire que sube durante la espera", "Silencio total al mostrar el resultado los primeros 2 s"], "ritmo": "Lento al inicio, acelera en la espera, respira en el resultado"},
      post={"texto": "3 minutos. ¿Se nota que es IA? Día 16/30.", "hashtags": ["#inteligenciaartificial", "#videoia", "#ia", "#creadores", "#reto30dias"], "sonido": "Instrumental electrónico (banco propio mientras IG siga en modo empresa)"})),
  "2026-11-16": dict(pilar="optimizo", formato="Por dentro · pantalla en tiempo real", titulo="María llama: la vendedora que no es persona",
    datos=dict(
      origen="persona (María) + objeto (el flujo en tiempo real)",
      por_que="Asombro y un poco de vértigo: escuchar una llamada real hecha por una IA. Muestra Optimizo funcionando sin vender nada.",
      ganchos_alt=["La persona que llamó a este cliente no existe.", "Esto antes lo hacía un equipo completo."],
      duracion="45–70 s",
      grabar={"plano": "Medio, sentado, con la pantalla del flujo detrás o al lado", "lugar": "Escritorio", "luz": "Baja y cálida; la pantalla encendida", "ropa": "Oscura"},
      beats=[
        b("GANCHO", C, "Esta llamada la hizo una inteligencia artificial. Escucha.",
          hace="Tranquilo, casi en voz baja. Después de «escucha» te quedas en silencio mirando al lente.", plano="Primer plano"),
        b("LA LLAMADA", P, "(se escucha la llamada de María, 8–12 segundos)",
          ve="Grabación de pantalla CON AUDIO de una llamada de María (de prueba o con permiso), con el flujo moviéndose en tiempo real."),
        b("QUÉ HACE", V, "María llama, entiende lo que la persona necesita y agenda. Mientras habla, todo queda anotado solo.",
          ve="El flujo de Nexor avanzando paso a paso (grabación de pantalla, 10 s)."),
        b("QUIÉN LO ARMA", C, "Esto lo arma Joaco, otro de los cofundadores de Optimizo. Es el flujo comercial completo, de punta a punta.",
          hace="Tranquilo, con un gesto hacia la pantalla."),
        b("EL NÚMERO", P, "[Un número real: cuántas llamadas, cuántas reuniones agendadas, en cuánto tiempo.]",
          ve="La pantalla con ese número (panel o calendario lleno, difuminando nombres)."),
        b("CIERRE", C, "Antes esto era un equipo completo. Ahora es un sistema.",
          hace="Lento. 1 s en silencio mirando al lente al terminar."),
      ],
      broll=["La pantalla del flujo de cerca, en la oscuridad (5 s)"],
      recursos=[r("Una llamada de María grabada con audio", "De prueba, o real con permiso de la persona. Si no la tienes, pídesela a Joaco."),
                r("Grabación de pantalla del flujo en tiempo real", "Mientras ocurre la llamada, si se puede."),
                r("Un número real del sistema", "Llamadas, reuniones agendadas, tiempo de respuesta: el que sea más impresionante y cierto."),
                r("OK de Joaco para mostrarlo")],
      props=[],
      edicion={"estilo": "Thriller tranquilo: oscuro, la pantalla como única luz, la onda de audio de María dibujándose en el centro mientras habla. Corte a negro antes del cierre.", "subtitulos": "Lo que dice María en otro color, como subtítulo de película", "musica": "Pulso grave y lento, casi ambiente; desaparece durante la llamada", "efectos": ["Tono de llamada al inicio", "Clic suave en cada paso del flujo", "Grave profundo en «ahora es un sistema»"], "ritmo": "Pausado; la llamada se deja respirar"},
      post={"texto": "Esta llamada la hizo una IA. Día 26/30.", "hashtags": ["#inteligenciaartificial", "#ventas", "#automatizacion", "#emprendimiento", "#reto30dias"], "sonido": "Ambiente propio (la llamada tiene que escucharse)"})),
}

RITMO = {  # 22-oct: tono cinematográfico (cerebro/10): menos zoom punch, más intención
  "Corte o zoom cada 2 s": "Cortes con intención: rápido en el gancho, respira en «también»",
  "Corte cada 1–1,5 s, siempre al beat": "Al beat de la música, con planos de detalle que respiran",
  "Cambio visual cada 2 s": "Un cambio por idea, acercamientos lentos",
  "Zoom punch en cada idea": "Acercamiento lento en cada idea",
  "Zoom punch por punto": "Acercamiento lento por punto",
  "Zoom punch en cada frase": "Plano fijo y cerca; acercamiento lento hasta el final",
}

ruta = pathlib.Path(__file__).with_name("calendario-01.json")
videos = json.loads(ruta.read_text())
for v in videos:
    if v["fecha"] in NUEVOS:
        n = NUEVOS[v["fecha"]]
        v.update(pilar=n["pilar"], formato=n["formato"], titulo=n["titulo"], gancho=n["datos"]["beats"][0]["dice"], datos=n["datos"])
        continue
    g = G[v["fecha"]]
    v["datos"]["beats"] = g["beats"]
    v["datos"]["broll"] = g["broll"]
    v["datos"]["recursos"] = g["recursos"]
    v["gancho"] = g["beats"][0]["dice"]  # el gancho siempre es el primer párrafo
    if v["pilar"] == "condor": v["pilar"] = "optimizo"
    aj = AJUSTES.get(v["fecha"], {})
    for k in ("titulo", "formato"):
        if k in aj: v[k] = aj[k]
    v["datos"].update(aj.get("datos", {}))
    ed = v["datos"].get("edicion", {})
    if ed.get("ritmo") in RITMO: ed["ritmo"] = RITMO[ed["ritmo"]]
    ed["efectos"] = [x.replace("zoom punch", "acercamiento lento") for x in ed.get("efectos", [])]
    if v["fecha"] == "2026-11-05" and "POV" not in v["datos"]["edicion"]["estilo"]:
        v["datos"]["edicion"]["estilo"] = "Texto en pantalla desde el primer cuadro: «POV: eres el único de la oficina que sabe usar IA». " + v["datos"]["edicion"]["estilo"]
ruta.write_text(json.dumps(videos, ensure_ascii=False, indent=2) + "\n")
print("ok", len(videos))
