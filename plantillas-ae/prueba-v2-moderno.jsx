// Prueba v2 «Aquí se construye» — cinematográfico MODERNO de redes (Max, 22-oct: «más TikTok… letras bold… más rápido,
// más movimiento… cosas épicas»). 9:16, cortes al beat de «Flashing Lights» (89,1 BPM, fase 0,42 s), tarjetas flotantes,
// texto cinético bold, zoom punch, sacudidas y destellos en los golpes. Se corre con plantillas-ae/correr.jsx.
app.beginSuppressDialogs();
var RAIZ = "/Users/osito/Proyectos/estudio-video";
var M = RAIZ + "/material/2026-10-22-prueba";
var BIB = RAIZ + "/biblioteca";
var log = new File(M + "/trabajo/armar.log"); log.encoding = "UTF-8"; log.open("w");
function w(s) { log.writeln(s); log.close(); log.open("a"); }

var W = 1080, H = 1920, FPS = 30, DUR = 15.2;
var BPM = 89.1, FASE = 0.42, BEAT = 60 / BPM;
function b(k) { return FASE + k * BEAT; }               // segundo del beat k
var BLANCO = [1, 1, 1], ACENTO = [1, 0.416, 0.075];     // mandarina Optimizo #FF6A13
var LETRA = "ClashDisplay-Bold", LETRA2 = "Satoshi-Black";

function importar(ruta) { return app.project.importFile(new ImportOptions(new File(ruta))); }
function suave(prop, influencia) {
  for (var k = 1; k <= prop.numKeys; k++) {
    var n = 1; try { if (prop.value instanceof Array && prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) n = prop.value.length; } catch (x) {}
    var e = []; for (var d = 0; d < n; d++) e.push(new KeyframeEase(0, influencia || 80));
    try { prop.setTemporalEaseAtKey(k, e, e); } catch (x) {}
  }
}
function claves(prop, pares, infl) { for (var i = 0; i < pares.length; i++) prop.setValueAtTime(pares[i][0], pares[i][1]); suave(prop, infl); }
function tr(L, nombre) { return L.property("ADBE Transform Group").property(nombre); }

// Rectángulo redondeado como máscara (coordenadas de la capa).
function rectRedondo(w0, h0, r) {
  var s = new Shape(), k = 0.5523 * r;
  s.vertices = [[r, 0], [w0 - r, 0], [w0, r], [w0, h0 - r], [w0 - r, h0], [r, h0], [0, h0 - r], [0, r]];
  s.inTangents = [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]];
  s.outTangents = [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]];
  s.closed = true; return s;
}

// Texto bold con entrada «pop» (escala con rebote + desenfoque + opacidad) palabra por palabra.
function texto(comp, contenido, t0, t1, y, tam, color, opciones) {
  opciones = opciones || {};
  var T = comp.layers.addText(contenido);
  var d = T.property("ADBE Text Properties").property("ADBE Text Document").value;
  d.font = opciones.letra || LETRA; d.fontSize = tam; d.fillColor = color; d.applyFill = true; d.applyStroke = false;
  d.justification = ParagraphJustification.CENTER_JUSTIFY; d.tracking = opciones.tracking === undefined ? -10 : opciones.tracking;
  d.leading = Math.round(tam * 0.92);
  T.property("ADBE Text Properties").property("ADBE Text Document").setValue(d);
  // Que nunca se salga del cuadro: se mide y se achica la letra hasta caber en el ancho útil.
  var maxAncho = opciones.maxAncho || 940;
  var ancho = T.sourceRectAtTime(t0, false).width;
  if (ancho > maxAncho) { d.fontSize = Math.floor(tam * maxAncho / ancho); d.leading = Math.round(d.fontSize * 0.92); T.property("ADBE Text Properties").property("ADBE Text Document").setValue(d); }
  tr(T, "ADBE Position").setValue([W / 2, y]);
  T.inPoint = t0; T.outPoint = t1; T.motionBlur = true;
  var an = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  var pr = an.property("ADBE Text Animator Properties");
  pr.addProperty("ADBE Text Opacity").setValue(0);
  pr.addProperty("ADBE Text Scale 3D").setValue([165, 165, 100]);
  pr.addProperty("ADBE Text Blur").setValue([30, 30]);
  var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  sel.property("ADBE Text Range Advanced").property("ADBE Text Range Type2").setValue(opciones.porLetra ? 1 : 3);
  sel.property("ADBE Text Range Advanced").property("ADBE Text Selector Smoothness").setValue(100);
  var ini = sel.property("ADBE Text Percent Start");
  var tiempos = opciones.tiempos || [t0];
  var n = tiempos.length;
  for (var p = 0; p < n; p++) { ini.setValueAtTime(tiempos[p], 100 * p / n); ini.setValueAtTime(tiempos[p] + 0.12, 100 * (p + 1) / n); }
  if (opciones.sombra !== false) {
    var ds = T.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
    ds.property(2).setValue(160); ds.property(4).setValue(10); ds.property(5).setValue(40);
  }
  if (opciones.brillo) {
    var g = T.property("ADBE Effect Parade").addProperty("ADBE Glo2");
    g.property("ADBE Glo2-0002").setValue(60); g.property("ADBE Glo2-0003").setValue(45); g.property("ADBE Glo2-0004").setValue(0.45);
  }
  if (opciones.salida !== false) claves(tr(T, "ADBE Opacity"), [[t1 - 0.12, 100], [t1, 0]]);
  return T;
}

try {
  if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
  app.newProject();
  var P = app.project;
  var todo = P.items.addComp("TODO", W, H, 1, DUR, FPS);
  todo.motionBlur = true; todo.shutterAngle = 220; todo.motionBlurSamplesPerFrame = 24; todo.bgColor = [0, 0, 0];
  var tomas = {};
  function toma(id) { if (!tomas[id]) tomas[id] = importar(M + "/tomas/" + id + ".MOV"); return tomas[id]; }

  // Clip horizontal a pantalla completa vertical (recorte al centro + acercamiento continuo).
  function completo(id, desde, t0, t1, s0, s1, opac) {
    var L = todo.layers.add(toma(id));
    L.startTime = t0 - desde; L.inPoint = t0; L.outPoint = t1; L.audioEnabled = false; L.motionBlur = true;
    claves(tr(L, "ADBE Scale"), [[t0, [s0, s0]], [t1, [s1, s1]]], 40);
    if (opac !== undefined) tr(L, "ADBE Opacity").setValue(opac);
    return L;
  }

  // ── 1 · Gancho sobre la nave (voz: «Lo que hacemos acá no se ve desde afuera») ──
  var V0 = FASE; // la voz entra en el primer beat
  completo("IMG_4815", 0.3, 0, b(4), 182, 205, 72);
  texto(todo, "LO QUE\rHACEMOS ACÁ", V0, V0 + 1.22, 860, 150, BLANCO, { tiempos: [V0, V0 + 0.54, V0 + 0.66, V0 + 0.86] });
  texto(todo, "NO SE VE\rDESDE", V0 + 1.22, b(4), 820, 150, BLANCO, { tiempos: [V0 + 1.22, V0 + 1.5, V0 + 1.64, V0 + 1.76] });
  texto(todo, "AFUERA", V0 + 1.94, b(4), 1110, 210, ACENTO);
  w("gancho ok");

  // ── 2 · Montaje al beat: tarjetas flotantes sobre el mismo clip desenfocado + palabra gigante detrás ──
  var tarjetas = [["IMG_4804", 0.5], ["IMG_4818", 1.0], ["IMG_4813", 0.4], ["IMG_4807", 0.3], ["IMG_4819", 0.9],
                  ["IMG_4812", 1.1], ["IMG_4820", 0.7], ["IMG_4816", 0.6], ["IMG_4811", 0.8], ["IMG_4806", 0.5]];
  var palabras = [["CÓDIGO", 0], ["DISEÑO", 2], ["EQUIPO", 4], ["IA", 6], ["SISTEMAS", 8]];
  var K0 = 4; // la primera tarjeta entra en el beat 4
  for (var i = 0; i < tarjetas.length; i++) {
    var t0 = b(K0 + i), t1 = b(K0 + i + 1), id = tarjetas[i][0], desde = tarjetas[i][1];
    // fondo: el mismo clip a pantalla completa, desenfocado y oscuro
    var fondo = completo(id, desde, t0, t1, 190, 200, 45);
    var gb = fondo.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
    gb.property("ADBE Gaussian Blur 2-0001").setValue(70); gb.property("ADBE Gaussian Blur 2-0003").setValue(1);
  }
  for (var j = 0; j < palabras.length; j++) {
    var tp0 = b(K0 + palabras[j][1]), tp1 = b(K0 + palabras[j][1] + 2);
    var gig = texto(todo, palabras[j][0], tp0, tp1, 980, palabras[j][0].length > 6 ? 230 : 330, BLANCO, { sombra: false, salida: false });
    tr(gig, "ADBE Opacity").setValue(28);
    claves(tr(gig, "ADBE Scale"), [[tp0, [100, 100]], [tp1, [112, 112]]], 30);
  }
  for (var i2 = 0; i2 < tarjetas.length; i2++) {
    var c0 = b(K0 + i2), c1 = b(K0 + i2 + 1), id2 = tarjetas[i2][0];
    var T = todo.layers.add(toma(id2));
    T.startTime = c0 - tarjetas[i2][1]; T.inPoint = c0; T.outPoint = c1; T.audioEnabled = false; T.motionBlur = true;
    var mk = T.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    mk.property("ADBE Mask Shape").setValue(rectRedondo(1920, 1080, 70));
    var sombra = T.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
    sombra.property(2).setValue(180); sombra.property(4).setValue(40); sombra.property(5).setValue(90);
    var lado = i2 % 2 === 0 ? 1 : -1;
    claves(tr(T, "ADBE Scale"), [[c0, [38, 38]], [c0 + 0.16, [53, 53]], [c0 + 0.3, [50, 50]], [c1, [52.5, 52.5]]], 70);
    claves(tr(T, "ADBE Rotate Z"), [[c0, -7 * lado], [c0 + 0.3, 0], [c1, 1.2 * lado]], 70);
    claves(tr(T, "ADBE Position"), [[c0, [W / 2 + 260 * lado, H / 2 + 120]], [c0 + 0.25, [W / 2, H / 2]], [c1, [W / 2 - 30 * lado, H / 2 - 10]]], 75);
  }
  w("montaje ok");

  // ── 3 · Max a cámara: «Por eso empecé a grabarlo» (subtítulos bold bajo el mentón) ──
  var MAX0 = b(K0 + tarjetas.length);           // ≈ 9,85 s
  var VOZ2 = MAX0 + 0.1;                        // la voz de la segunda frase arranca acá (segundo 2,40 de la toma)
  // la toma arranca alineada con la voz: el segundo 2,40 de la toma cae en VOZ2
  var fondoMax = completo("IMG_4826", 2.40 - (VOZ2 - MAX0), MAX0, 11.75, 200, 210, 50);
  var gm = fondoMax.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
  gm.property("ADBE Gaussian Blur 2-0001").setValue(60); gm.property("ADBE Gaussian Blur 2-0003").setValue(1);
  var maxF = completo("IMG_4826", 2.40 - (VOZ2 - MAX0), MAX0, 11.75, 138, 146);
  tr(maxF, "ADBE Position").setValue([W / 2 + 240, H / 2 - 60]); // la cara está a la izquierda de la toma original
  var base2 = VOZ2 - 2.40;
  texto(todo, "POR ESO", base2 + 2.48, base2 + 2.80, 1480, 120, BLANCO, { tiempos: [base2 + 2.48, base2 + 2.66] });
  texto(todo, "EMPECÉ A", base2 + 2.80, base2 + 3.28, 1480, 120, BLANCO, { tiempos: [base2 + 2.80, base2 + 3.12] });
  texto(todo, "GRABARLO", base2 + 3.28, 11.75, 1480, 150, ACENTO);
  w("max ok");

  // ── 4 · Final épico: «AQUÍ / SE / CONSTRUYE» en tres golpes sobre la nave ──
  var F0 = 11.87, F1 = F0 + BEAT, F2 = F1 + BEAT;
  var naveF = completo("IMG_4814", 0.5, F0, DUR, 200, 228, 55);
  var gf = naveF.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
  gf.property("ADBE Gaussian Blur 2-0001").setValue(18); gf.property("ADBE Gaussian Blur 2-0003").setValue(1);
  texto(todo, "AQUÍ", F0, DUR, 700, 250, BLANCO, { brillo: true, salida: false });
  texto(todo, "SE", F1, DUR, 930, 250, BLANCO, { brillo: true, salida: false });
  texto(todo, "CONSTRUYE", F2, DUR, 1160, 205, ACENTO, { salida: false });
  w("final ok");

  // ── Comp final: TODO + golpes (zoom punch + sacudida) + destellos + color + sonido ──
  var c = P.items.addComp("FINAL 9x16", W, H, 1, DUR, FPS);
  c.motionBlur = true; c.shutterAngle = 220; c.bgColor = [0, 0, 0];
  var L = c.layers.add(todo); L.motionBlur = true;
  var golpes = [b(K0), b(K0 + 4), b(K0 + 8), MAX0, F0, F1, F2];
  var esc = tr(L, "ADBE Scale"), pos = tr(L, "ADBE Position");
  esc.setValueAtTime(0, [100, 100]); pos.setValueAtTime(0, [W / 2, H / 2]);
  for (var g = 0; g < golpes.length; g++) {
    var t = golpes[g], f = g >= 4 ? 1.6 : 1;
    esc.setValueAtTime(t - 0.01, [100, 100]); esc.setValueAtTime(t + 0.05, [100 + 7 * f, 100 + 7 * f]); esc.setValueAtTime(t + 0.28, [100, 100]);
    pos.setValueAtTime(t + 0.03, [W / 2 + 22 * f, H / 2 - 14 * f]); pos.setValueAtTime(t + 0.07, [W / 2 - 16 * f, H / 2 + 12 * f]);
    pos.setValueAtTime(t + 0.12, [W / 2 + 8 * f, H / 2 - 5 * f]); pos.setValueAtTime(t + 0.2, [W / 2, H / 2]);
  }
  suave(esc, 60);

  var look = c.layers.addSolid([0, 0, 0], "LOOK", W, H, 1, DUR); look.adjustmentLayer = true;
  var lu = look.property("ADBE Effect Parade").addProperty("ADBE Lumetri");
  var aj = [["0012", 26], ["0013", -18], ["0014", 6], ["0015", 4], ["0016", -10], ["0020", 104], ["0030", 14]];
  for (var a = 0; a < aj.length; a++) { try { lu.property("ADBE Lumetri-" + aj[a][0]).setValue(aj[a][1]); } catch (x) {} }
  var gl = look.property("ADBE Effect Parade").addProperty("ADBE Glo2");
  gl.property("ADBE Glo2-0002").setValue(88); gl.property("ADBE Glo2-0003").setValue(50); gl.property("ADBE Glo2-0004").setValue(0.25);

  var flash = c.layers.addSolid([1, 1, 1], "DESTELLO", W, H, 1, DUR);
  var fo = tr(flash, "ADBE Opacity"); fo.setValueAtTime(0, 0);
  var destellos = [b(K0), MAX0, F0, F2];
  for (var d2 = 0; d2 < destellos.length; d2++) { var td = destellos[d2]; fo.setValueAtTime(td - 0.01, 0); fo.setValueAtTime(td + 0.02, 55); fo.setValueAtTime(td + 0.16, 0); }
  // Entrada desde negro rápida
  var negro = c.layers.addSolid([0, 0, 0], "ENTRADA", W, H, 1, 0.5);
  claves(tr(negro, "ADBE Opacity"), [[0, 100], [0.35, 0]]);
  w("golpes y look ok");

  // ── Sonido ──
  function audio(ruta, t, nivel, desde, hasta) {
    var A = c.layers.add(importar(ruta));
    A.startTime = t - (desde || 0); A.inPoint = t; if (hasta) A.outPoint = hasta;
    var niv = A.property("ADBE Audio Group").property("ADBE Audio Levels");
    if (nivel instanceof Array) { for (var q = 0; q < nivel.length; q++) niv.setValueAtTime(nivel[q][0], [nivel[q][1], nivel[q][1]]); }
    else niv.setValue([nivel, nivel]);
    return A;
  }
  audio(BIB + "/canciones/pop-eeuu/Kanye West - Flashing Lights.m4a", 0, [[0, -7], [V0, -13], [V0 + 2.3, -7], [MAX0, -14], [11.2, -6], [DUR - 0.15, -6], [DUR, -40]]);
  audio(M + "/trabajo/voz-4826-limpia.wav", V0, 3, 0, V0 + 2.32);
  audio(M + "/trabajo/voz-4826-limpia.wav", VOZ2, 3, 2.40, VOZ2 + 1.25);
  var whoosh = [BIB + "/sonidos/mixkit/whoosh/Air woosh - 1489.mp3", BIB + "/sonidos/mixkit/swoosh/Fast air sweep transition - 168.mp3"];
  for (var s = 0; s < tarjetas.length; s++) audio(whoosh[s % 2], b(K0 + s) - 0.08, -17);
  var golpe = BIB + "/sonidos/sonniss-gdc-2026/Cinematic Sound Design - Ultra Transitions & Impacts/Impact Hit Rapid Chord Reverb.wav";
  audio(golpe, F0, -9); audio(golpe, F1, -11); audio(golpe, F2, -7);
  audio(BIB + "/sonidos/sonniss-gdc-2026/344 Audio - Bass Drops & Downers Vol. 2/DSGNBass_Bass Drop & Downer Medium 15_344 Audio_Bass Drops & Downers Vol 2.wav", F0, -8);
  audio(BIB + "/sonidos/mixkit/cinematic/Cinematic trailer riser - 790.mp3", F0 - 2.53, -12);
  w("sonido ok");

  P.save(new File(M + "/trabajo/aqui-se-construye-v2.aep"));
  w("guardado ok");
} catch (e) { w("ERROR línea " + e.line + ": " + e.toString()); }
w("FIN");
log.close();
