// Pieza «Título detrás del sujeto» (guion visual Heika, 22-oct-2026).
// El patrón de 7 de las 10 referencias de Max: el título va DETRÁS de la persona (máscara de Vision como mate de luminancia).
// Estética Heika: Inter Display Black, hueso #f6f3f1, punto rojo #ff0042, destello con el degradado de la marca.
// Arma «PIEZA 16x9» y «PIEZA 9x16» con la misma lógica. Se corre con plantillas-ae/correr.jsx.
app.beginSuppressDialogs();
var RAIZ = "/Users/osito/Proyectos/estudio-video";
var M = RAIZ + "/material/2026-10-22-prueba";
var log = new File(M + "/trabajo/armar.log"); log.encoding = "UTF-8"; log.open("w");
function w(s) { log.writeln(s); log.close(); log.open("a"); }

var TOMA = "IMG_4808", MATE = "mate-4808", DUR = 3.0, FPS = 24;
var HUESO = [0.965, 0.953, 0.945], ROJO = [1, 0, 0.259];
var DEGRADADO = [[0.922, 0.486, 0.376], [0.988, 0.243, 0.251], [1, 0, 0.259], [0.992, 0.341, 0.192], [0.996, 0.620, 0.455]];

function importar(r) { return app.project.importFile(new ImportOptions(new File(r))); }
function tr(L, n) { return L.property("ADBE Transform Group").property(n); }
function suave(p, infl) {
  for (var k = 1; k <= p.numKeys; k++) {
    var n = 1; try { if (p.value instanceof Array && p.propertyValueType !== PropertyValueType.TwoD_SPATIAL && p.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) n = p.value.length; } catch (x) {}
    var e = []; for (var d = 0; d < n; d++) e.push(new KeyframeEase(0, infl || 80));
    try { p.setTemporalEaseAtKey(k, e, e); } catch (x) {}
  }
}
function claves(p, pares, infl) { for (var i = 0; i < pares.length; i++) p.setValueAtTime(pares[i][0], pares[i][1]); suave(p, infl); }

function texto(c, contenido, letra, tam, color, tracking, pos) {
  var T = c.layers.addText(contenido);
  var d = T.property("ADBE Text Properties").property("ADBE Text Document").value;
  d.font = letra; d.fontSize = tam; d.fillColor = color; d.applyFill = true; d.applyStroke = false;
  d.tracking = tracking; d.justification = ParagraphJustification.CENTER_JUSTIFY;
  T.property("ADBE Text Properties").property("ADBE Text Document").setValue(d);
  tr(T, "ADBE Position").setValue(pos); T.motionBlur = true;
  // sombra suave para que se lea sobre fondos claros (pared, cielo) sin verse «efecto»
  var ds = T.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
  ds.property(2).setValue(95); ds.property(4).setValue(0); ds.property(5).setValue(tam * 0.35);
  return T;
}
// Entrada por letra: sube desde abajo, con desenfoque, escalonada (rango por caracteres).
function entradaPorLetra(T, t0, dur, subida, desenfoque) {
  var an = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  var pr = an.property("ADBE Text Animator Properties");
  pr.addProperty("ADBE Text Opacity").setValue(0);
  pr.addProperty("ADBE Text Position 3D").setValue([0, subida, 0]);
  pr.addProperty("ADBE Text Blur").setValue([desenfoque, desenfoque]);
  var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  var av = sel.property("ADBE Text Range Advanced");
  av.property("ADBE Text Range Type2").setValue(1);            // por caracteres
  av.property("ADBE Text Selector Smoothness").setValue(100);
  // Start 0→100: cada letra deja de estar afectada (aparece) cuando el inicio del rango pasa por ella.
  var ini = sel.property("ADBE Text Percent Start");
  ini.setValueAtTime(0, 0);
  claves(ini, [[t0, 0], [t0 + dur, 100]], 60);
}

function armar(nombre, W, H, escalaToma, tamTitulo, tamBajada, yTitulo) {
  var c = app.project.items.addComp(nombre, W, H, 1, DUR, FPS);
  c.motionBlur = true; c.shutterAngle = 180; c.motionBlurSamplesPerFrame = 24; c.bgColor = [0, 0, 0];
  var toma = importar(M + "/tomas/" + TOMA + ".MOV"), mate = importar(M + "/trabajo/" + MATE + ".mov");
  // 1 · fondo
  var base = c.layers.add(toma); base.audioEnabled = false;
  claves(tr(base, "ADBE Scale"), [[0, [escalaToma, escalaToma]], [DUR, [escalaToma * 1.04, escalaToma * 1.04]]], 30);
  // oscurecer suave la parte alta del cuadro (donde va el título): degradado negro → transparente
  var sombraTop = c.layers.addSolid([0, 0, 0], "SOMBRA ARRIBA", W, H, 1, DUR);
  var rs = sombraTop.property("ADBE Effect Parade").addProperty("ADBE Ramp");
  rs.property(1).setValue([W / 2, 0]); rs.property(2).setValue([0, 0, 0]); rs.property(3).setValue([W / 2, H * 0.62]); rs.property(4).setValue([1, 1, 1]);
  sombraTop.blendingMode = BlendingMode.MULTIPLY; tr(sombraTop, "ADBE Opacity").setValue(55);
  // 2 · título (queda entre el fondo y la persona)
  var bajada = texto(c, "EL SISTEMA QUE EDITA MIS VIDEOS", "InterDisplay-SemiBold", tamBajada, HUESO, 320, [W / 2, yTitulo - tamTitulo * 0.62]);
  entradaPorLetra(bajada, 0.15, 0.7, 12, 8);
  var titulo = texto(c, "HEIKA", "InterDisplay-Black", tamTitulo, HUESO, -30, [W / 2, yTitulo + tamTitulo * 0.32]);
  entradaPorLetra(titulo, 0.3, 0.75, tamTitulo * 0.35, 30);
  claves(tr(titulo, "ADBE Scale"), [[0.3, [96, 96]], [DUR, [103, 103]]], 30);
  var punto = c.layers.addShape(); punto.name = "PUNTO";
  var g = punto.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
  var el = g.addProperty("ADBE Vector Shape - Ellipse"); el.property("ADBE Vector Ellipse Size").setValue([tamBajada * 0.55, tamBajada * 0.55]);
  g.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(ROJO);
  var anchoBajada = bajada.sourceRectAtTime(1, false).width;
  tr(punto, "ADBE Position").setValue([W / 2 - anchoBajada / 2 - tamBajada * 0.9, yTitulo - tamTitulo * 0.62 - tamBajada * 0.32]);
  claves(tr(punto, "ADBE Scale"), [[0.1, [0, 0]], [0.35, [130, 130]], [0.5, [100, 100]]], 70);
  // 3 · la persona encima del título (copia de la toma recortada con el mate)
  var arriba = c.layers.add(toma); arriba.audioEnabled = false;
  claves(tr(arriba, "ADBE Scale"), [[0, [escalaToma, escalaToma]], [DUR, [escalaToma * 1.04, escalaToma * 1.04]]], 30);
  var capaMate = c.layers.add(mate);
  claves(tr(capaMate, "ADBE Scale"), [[0, [escalaToma, escalaToma]], [DUR, [escalaToma * 1.04, escalaToma * 1.04]]], 30);
  arriba.setTrackMatte(capaMate, TrackMatteType.LUMA); capaMate.enabled = false;
  // el mate de Vision viene duro: se suaviza el borde para que no se vea recortado
  var bm = capaMate.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
  bm.property("ADBE Gaussian Blur 2-0001").setValue(4);
  // 4 · destello con el degradado de Heika (luz que entra por un costado, en modo pantalla)
  var luz = c.layers.addSolid(DEGRADADO[1], "LUZ HEIKA", W, H, 1, DUR);
  var rampa = luz.property("ADBE Effect Parade").addProperty("ADBE Ramp");
  rampa.property(1).setValue([0, H * 0.1]); rampa.property(2).setValue(DEGRADADO[0]);
  rampa.property(3).setValue([W * 0.55, H * 0.7]); rampa.property(4).setValue([0, 0, 0]);
  luz.blendingMode = BlendingMode.SCREEN;
  claves(tr(luz, "ADBE Opacity"), [[0, 0], [0.6, 32], [DUR, 22]], 40);
  // 5 · look: contraste y color moderno, sombras más frías
  var look = c.layers.addSolid([0, 0, 0], "LOOK", W, H, 1, DUR); look.adjustmentLayer = true;
  var lu = look.property("ADBE Effect Parade").addProperty("ADBE Lumetri");
  var aj = [["0007", -4], ["0012", 24], ["0013", -26], ["0014", 8], ["0016", -8], ["0020", 110], ["0030", 16]];
  for (var a = 0; a < aj.length; a++) { try { lu.property("ADBE Lumetri-" + aj[a][0]).setValue(aj[a][1]); } catch (x) {} }
  w(nombre + " ok");
  return c;
}

try {
  if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
  app.newProject();
  armar("PIEZA 16x9", 1920, 1080, 100, 300, 30, 400);
  armar("PIEZA 9x16", 1080, 1920, 178, 250, 26, 400);
  app.project.save(new File(M + "/trabajo/pieza-titulo-detras.aep"));
  w("guardado ok");
} catch (e) { w("ERROR línea " + e.line + ": " + e.toString()); }
w("FIN"); log.close();
