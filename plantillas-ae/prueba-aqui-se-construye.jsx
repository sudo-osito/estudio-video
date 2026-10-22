// Prueba «Aquí se construye» (22-oct-2026): arma la pieza completa en After Effects por script.
// Formato de cine 16:9 con barras 2,39:1 (todo se grabó horizontal a 1080p) + versión 9:16 con «ventana de cine».
// Corre dentro de After Effects (herramientas/ae.sh correr armar.jsx). Deja un registro en trabajo/armar.log.
app.beginSuppressDialogs();
var RAIZ = "/Users/osito/Proyectos/estudio-video";
var M = RAIZ + "/material/2026-10-22-prueba";
var BIB = RAIZ + "/biblioteca";
var LOOK = $.getenv("LOOK") || "lumetri";
var log = new File(M + "/trabajo/armar.log"); log.encoding = "UTF-8"; log.open("w");
function w(s) { log.writeln(s); log.close(); log.open("a"); }

var FPS = 30, W = 1920, H = 1080, DUR = 22;
var BARRA = Math.round((H - W / 2.39) / 2); // 138 px arriba y abajo

function importar(ruta) {
  var io = new ImportOptions(new File(ruta));
  return app.project.importFile(io);
}
function ease(prop) {
  for (var k = 1; k <= prop.numKeys; k++) {
    var e = new KeyframeEase(0, 70);
    var dims = prop.value instanceof Array ? prop.value.length : 1;
    var arr = []; for (var d = 0; d < (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL ? 1 : dims); d++) arr.push(e);
    try { prop.setTemporalEaseAtKey(k, arr, arr); } catch (x) {}
  }
}
function clave(prop, pares) { for (var i = 0; i < pares.length; i++) prop.setValueAtTime(pares[i][0], pares[i][1]); ease(prop); }

try {
  // Cerrar sin guardar lo que haya abierto: si no, «¿Guardar cambios?» bloquea el script.
  if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
  app.newProject();
  var proj = app.project;
  var c = proj.items.addComp("FINAL 16x9", W, H, 1, DUR, FPS);
  c.motionBlur = true; c.shutterAngle = 180; c.shutterPhase = -90; c.motionBlurSamplesPerFrame = 32;
  c.bgColor = [0, 0, 0];
  w("comp ok");

  // ── Montaje: [toma, inicio en la toma (s), inicio en la línea de tiempo, fin, escala inicial, escala final]
  var cortes = [
    ["IMG_4815", 0.4, 0.0, 3.2, 104, 114],   // la nave industrial por el vidrio (apertura)
    ["IMG_4804", 0.5, 3.2, 4.6, 106, 112],   // el Estudio en el laptop
    ["IMG_4818", 1.0, 4.6, 6.0, 108, 114],   // manos en el teclado
    ["IMG_4813", 0.4, 6.0, 7.4, 106, 113],   // código en pantalla
    ["IMG_4807", 0.3, 7.4, 9.4, 104, 110],   // colega con la nave detrás
    ["IMG_4819", 0.9, 9.4, 10.6, 108, 112],  // la mano en el mouse
    ["IMG_4812", 1.1, 10.6, 12.0, 106, 111], // escritorio, laptops, manos del equipo
    ["IMG_4820", 0.7, 12.0, 13.2, 106, 110]  // pantallas y videollamada
  ];
  var FRASE_T = 13.2, FRASE_FIN = 17.1;
  var capas = [];
  for (var i = cortes.length - 1; i >= 0; i--) {
    var k = cortes[i];
    var item = importar(M + "/tomas/" + k[0] + ".MOV");
    var L = c.layers.add(item);
    L.startTime = k[2] - k[1]; L.inPoint = k[2]; L.outPoint = k[3];
    L.audioEnabled = false; L.motionBlur = true;
    clave(L.property("ADBE Transform Group").property("ADBE Scale"), [[k[2], [k[4], k[4]]], [k[3], [k[5], k[5]]]]);
    capas.push(L);
  }
  w("montaje ok");

  // ── La frase: primera mitad en off sobre la nave, segunda mitad a cámara ──
  // (la toma frontal es tan cerrada que un texto «detrás» no se ve; ver revisión v1)
  var CORTE = 2.35; // segundo de la toma donde empieza «por eso empecé a grabarlo»
  var nave = c.layers.add(importar(M + "/tomas/IMG_4814.MOV"));
  nave.startTime = FRASE_T - 0.3; nave.inPoint = FRASE_T; nave.outPoint = FRASE_T + CORTE; nave.audioEnabled = false; nave.motionBlur = true;
  clave(nave.property("ADBE Transform Group").property("ADBE Scale"), [[FRASE_T, [104, 104]], [FRASE_T + CORTE, [111, 111]]]);
  var base = c.layers.add(importar(M + "/tomas/IMG_4826.MOV"));
  base.startTime = FRASE_T; base.inPoint = FRASE_T + CORTE; base.outPoint = FRASE_FIN; base.audioEnabled = false;
  clave(base.property("ADBE Transform Group").property("ADBE Scale"), [[FRASE_T + CORTE, [100, 100]], [FRASE_FIN, [105, 105]]]);

  // Subtítulos dentro de la barra negra de abajo (nunca sobre la cara), palabra por palabra al ritmo de la voz.
  var subtitulos = [];
  function subtitulo(texto, t0, t1, palabras) {
    var T = c.layers.addText(texto);
    var doc = T.property("ADBE Text Properties").property("ADBE Text Document").value;
    doc.font = "InstrumentSerif-Regular"; doc.fontSize = 58; doc.fillColor = [0.97, 0.94, 0.89];
    doc.applyFill = true; doc.applyStroke = false; doc.justification = ParagraphJustification.CENTER_JUSTIFY; doc.tracking = 0;
    T.property("ADBE Text Properties").property("ADBE Text Document").setValue(doc);
    T.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H - BARRA / 2 + 18]);
    T.inPoint = t0; T.outPoint = t1; T.motionBlur = true;
    var an = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
    var pr = an.property("ADBE Text Animator Properties");
    pr.addProperty("ADBE Text Opacity").setValue(0);
    pr.addProperty("ADBE Text Position 3D").setValue([0, 14, 0]);
    pr.addProperty("ADBE Text Blur").setValue([10, 10]);
    var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    sel.property("ADBE Text Range Advanced").property("ADBE Text Range Type2").setValue(3);
    sel.property("ADBE Text Range Advanced").property("ADBE Text Selector Smoothness").setValue(100);
    var ini = sel.property("ADBE Text Percent Start");
    var n = palabras.length;
    for (var p = 0; p < n; p++) ini.setValueAtTime(FRASE_T + palabras[p], 100 * p / n);
    ini.setValueAtTime(FRASE_T + palabras[n - 1] + 0.2, 100);
    clave(T.property("ADBE Transform Group").property("ADBE Opacity"), [[t1 - 0.3, 100], [t1, 0]]);
    subtitulos.push(T);
  }
  subtitulo("Lo que hacemos acá no se ve desde afuera.", FRASE_T, FRASE_T + CORTE + 0.05, [0.05, 0.54, 0.66, 0.86, 1.22, 1.5, 1.64, 1.76, 1.94]);
  subtitulo("Por eso empecé a grabarlo.", FRASE_T + CORTE, FRASE_FIN, [2.48, 2.66, 2.8, 3.12, 3.28]);
  w("frase ok");

  // ── Look de color: oficina con piel cálida y sombras frías, negros profundos ──
  var look = c.layers.addSolid([0, 0, 0], "LOOK", W, H, 1, DUR);
  look.adjustmentLayer = true;
  var fx = look.property("ADBE Effect Parade");
  if (LOOK === "lumetri") {
    var lu = fx.addProperty("ADBE Lumetri");
    var ajustes = [["0007", 7], ["0008", 2], ["0011", -0.1], ["0012", 22], ["0013", -22], ["0014", -6], ["0015", 6], ["0016", -14], ["0020", 88], ["0028", 7], ["0030", 10]];
    for (var a = 0; a < ajustes.length; a++) { try { lu.property("ADBE Lumetri-" + ajustes[a][0]).setValue(ajustes[a][1]); } catch (x) { w("lumetri " + ajustes[a][0] + ": " + x); } }
    w("lumetri ok");
  }
  // Sombras frías / luces cálidas (la piel cálida contra el fondo azul acero de la oficina), mezclado suave.
  try {
    var tri = fx.addProperty("ADBE Tritone");
    tri.property(1).setValue([1.0, 0.86, 0.68]);   // luces: ámbar suave
    tri.property(2).setValue([0.55, 0.52, 0.50]);  // medios: neutro
    tri.property(3).setValue([0.03, 0.09, 0.13]);  // sombras: azul acero
    tri.property(4).setValue(84);                   // 84 % original = 16 % de efecto
    w("tritone ok");
  } catch (x) { w("tritone: " + x); }
  var glow = fx.addProperty("ADBE Glo2");
  glow.property("ADBE Glo2-0002").setValue(78);   // umbral
  glow.property("ADBE Glo2-0003").setValue(90);   // radio
  glow.property("ADBE Glo2-0004").setValue(0.25); // intensidad (halación suave)
  var ruido = fx.addProperty("ADBE Noise");
  ruido.property("ADBE Noise-0001").setValue(2.2);
  ruido.property("ADBE Noise-0002").setValue(0);  // grano sin color
  w("look ok");

  // Viñeta suave
  var vin = c.layers.addSolid([0, 0, 0], "VIÑETA", W, H, 1, DUR);
  var mk = vin.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
  var sh = new Shape(); var rx = W * 0.62, ry = H * 0.66, cx = W / 2, cy = H / 2, kk = 0.5523;
  sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
  sh.inTangents = [[-rx * kk, 0], [0, -ry * kk], [rx * kk, 0], [0, ry * kk]];
  sh.outTangents = [[rx * kk, 0], [0, ry * kk], [-rx * kk, 0], [0, -ry * kk]];
  sh.closed = true;
  mk.property("ADBE Mask Shape").setValue(sh); mk.inverted = true;
  mk.property("ADBE Mask Feather").setValue([420, 420]);
  vin.property("ADBE Transform Group").property("ADBE Opacity").setValue(45);

  // ── Corte a negro y título con la línea de luz (firma «Luz de trabajo») ──
  var T0 = 17.9;
  var linea = c.layers.addSolid([1, 0.86, 0.66], "LÍNEA DE LUZ", 1100, 3, 1, DUR);
  linea.inPoint = T0; linea.outPoint = DUR; linea.motionBlur = true;
  clave(linea.property("ADBE Transform Group").property("ADBE Scale"), [[T0, [0, 100]], [T0 + 0.9, [100, 100]]]);
  clave(linea.property("ADBE Transform Group").property("ADBE Position"), [[T0, [W / 2, H / 2 + 70]], [T0 + 0.9, [W / 2, H / 2 + 70]]]);
  clave(linea.property("ADBE Transform Group").property("ADBE Opacity"), [[T0, 0], [T0 + 0.15, 100], [T0 + 1.6, 100], [T0 + 2.6, 35]]);
  var gl = linea.property("ADBE Effect Parade").addProperty("ADBE Glo2");
  gl.property("ADBE Glo2-0002").setValue(10); gl.property("ADBE Glo2-0003").setValue(40); gl.property("ADBE Glo2-0004").setValue(2.2);

  var titulo = c.layers.addText("Aquí se construye.");
  var td = titulo.property("ADBE Text Properties").property("ADBE Text Document").value;
  td.font = "InstrumentSerif-Regular"; td.fontSize = 132; td.fillColor = [0.97, 0.94, 0.89]; td.tracking = -8;
  td.justification = ParagraphJustification.CENTER_JUSTIFY; td.applyStroke = false;
  titulo.property("ADBE Text Properties").property("ADBE Text Document").setValue(td);
  titulo.inPoint = T0 + 0.45; titulo.outPoint = DUR; titulo.motionBlur = true;
  clave(titulo.property("ADBE Transform Group").property("ADBE Position"), [[T0 + 0.45, [W / 2, H / 2 + 95]], [T0 + 1.5, [W / 2, H / 2 + 20]]]);
  clave(titulo.property("ADBE Transform Group").property("ADBE Opacity"), [[T0 + 0.45, 0], [T0 + 1.3, 100]]);
  var bl = titulo.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
  clave(bl.property("ADBE Gaussian Blur 2-0001"), [[T0 + 0.45, 40], [T0 + 1.4, 0]]);
  // El título nace desde la línea: máscara rectangular que solo deja ver lo que está sobre ella
  var mt = titulo.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
  var r = new Shape(); r.vertices = [[-2000, -2000], [2000, -2000], [2000, 48], [-2000, 48]]; r.closed = true;
  mt.property("ADBE Mask Shape").setValue(r); mt.property("ADBE Mask Feather").setValue([0, 12]);
  w("título ok");

  // Fundido final a negro de todo
  var negro = c.layers.addSolid([0, 0, 0], "FUNDIDO", W, H, 1, DUR);
  clave(negro.property("ADBE Transform Group").property("ADBE Opacity"), [[0, 100], [0.9, 0], [DUR - 1.0, 0], [DUR, 100]]);

  // Barras de cine 2,39:1 (encima de todo)
  var b1 = c.layers.addSolid([0, 0, 0], "BARRA ARRIBA", W, BARRA, 1, DUR);
  b1.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, BARRA / 2]);
  var b2 = c.layers.addSolid([0, 0, 0], "BARRA ABAJO", W, BARRA, 1, DUR);
  b2.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H - BARRA / 2]);
  for (var s2 = 0; s2 < subtitulos.length; s2++) subtitulos[s2].moveToBeginning();
  w("barras ok");

  // ── Sonido ──
  function audio(ruta, t, db, claves, dentro) {
    var it = importar(ruta);
    var A = c.layers.add(it);
    A.startTime = t - (dentro || 0); A.inPoint = t;
    if (A.hasVideo) A.enabled = false;
    var niv = A.property("ADBE Audio Group").property("ADBE Audio Levels");
    if (claves) { for (var q = 0; q < claves.length; q++) niv.setValueAtTime(claves[q][0], [claves[q][1], claves[q][1]]); }
    else niv.setValue([db, db]);
    return A;
  }
  audio(BIB + "/canciones/cine/Trent Reznor & Atticus Ross - Hand Covers Bruise.m4a", 0, 0,
    [[0, -40], [1.5, -9], [12.8, -9], [13.3, -19], [17.3, -19], [17.5, -30], [18.2, -11], [20.8, -11], [DUR, -48]]);
  audio(BIB + "/sonidos/freesound/industrial-ambience/General Fusion industrial workshop factory ambience1 heavy machine hum - 450119.mp3", 0, 0,
    [[0, -48], [0.6, -21], [13.0, -23], [17.3, -26], [17.5, -60]], 2);
  audio(BIB + "/sonidos/mixkit/typing/Laptop keyboard typing sequence - 2537.mp3", 4.6, -15, null, 1.0).outPoint = 6.1;
  audio(BIB + "/sonidos/freesound/mouse-click/mouse-click-single-00 - 534103.mp3", 9.92, -8);
  audio(M + "/trabajo/voz-4826-limpia.wav", FRASE_T, 2.5).outPoint = FRASE_FIN;
  audio(BIB + "/sonidos/sonniss-gdc-2026/344 Audio - Bass Drops & Downers Vol. 2/DSGNBass_Bass Drop & Downer Medium 15_344 Audio_Bass Drops & Downers Vol 2.wav", FRASE_FIN, -7);
  audio(BIB + "/sonidos/sonniss-gdc-2026/Cinematic Sound Design - Ultra Transitions & Impacts/Woosh Sweep Slide Infographics Basic.wav", T0 - 0.05, -13);
  w("sonido ok");

  // ── Versión 9:16: ventana de cine centrada ──
  var v = proj.items.addComp("FINAL 9x16", 1080, 1920, 1, DUR, FPS);
  v.bgColor = [0, 0, 0];
  var ventana = v.layers.add(c);
  ventana.property("ADBE Transform Group").property("ADBE Scale").setValue([56.25, 56.25]);
  w("vertical ok");

  proj.save(new File(M + "/trabajo/aqui-se-construye.aep"));
  w("guardado ok");
} catch (e) {
  w("ERROR línea " + e.line + ": " + e.toString());
}
w("FIN");
log.close();
