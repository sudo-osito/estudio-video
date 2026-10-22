// Catálogo de la biblioteca de sonidos: recorre biblioteca/sonidos/, mide cada archivo y lo guarda en
// biblioteca/catalogo.db (SQLite). Sin dependencias: AVFoundation + SQLite3 del sistema.
// uso: swift herramientas/catalogar.swift            (solo agrega lo nuevo)
//      swift herramientas/catalogar.swift --todo     (vuelve a medir todo)
// Mide: duración, pico (dBFS), energía media (RMS dBFS), punto de golpe (s, el instante de más energía en ventanas
// de 10 ms: ahí se alinea el sonido con el corte), ataque (s hasta el 90 % del pico) y brillo (cruces por cero/s).
// Los .ogg no los lee AVFoundation: convertirlos antes con herramientas/ogg-a-wav.mjs (si no, quedan solo por nombre).
import AVFoundation
import Foundation
import SQLite3

let raiz = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().deletingLastPathComponent()
let bib = raiz.appendingPathComponent("biblioteca")
let sonidos = bib.appendingPathComponent("sonidos")
let todo = CommandLine.arguments.contains("--todo")

var db: OpaquePointer?
guard sqlite3_open(bib.appendingPathComponent("catalogo.db").path, &db) == SQLITE_OK else { fatalError("no abre la base") }
func ejecutar(_ sql: String) { if sqlite3_exec(db, sql, nil, nil, nil) != SQLITE_OK { print("SQL:", String(cString: sqlite3_errmsg(db))) } }
ejecutar("""
CREATE TABLE IF NOT EXISTS sonidos (
  ruta TEXT PRIMARY KEY, fuente TEXT, categoria TEXT, nombre TEXT, etiquetas TEXT,
  duracion REAL, pico_db REAL, rms_db REAL, golpe REAL, ataque REAL, brillo REAL,
  favorito INTEGER DEFAULT 0, descartado INTEGER DEFAULT 0, medido TEXT)
""")
let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

var existentes = Set<String>()
if !todo {
  var st: OpaquePointer?
  sqlite3_prepare_v2(db, "SELECT ruta FROM sonidos", -1, &st, nil)
  while sqlite3_step(st) == SQLITE_ROW { existentes.insert(String(cString: sqlite3_column_text(st, 0))) }
  sqlite3_finalize(st)
}

struct Medida { var duracion = 0.0, pico = -120.0, rms = -120.0, golpe = 0.0, ataque = 0.0, brillo = 0.0 }

func medir(_ url: URL) -> Medida? {
  autoreleasepool {
    guard let f = try? AVAudioFile(forReading: url) else { return nil }
    let fmt = f.processingFormat
    let sr = fmt.sampleRate
    let total = AVAudioFrameCount(f.length)
    guard total > 0, let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: total), (try? f.read(into: buf)) != nil,
          let canales = buf.floatChannelData else { return nil }
    let n = Int(buf.frameLength), nc = Int(fmt.channelCount)
    let ventana = max(1, Int(sr * 0.01))
    var m = Medida(duracion: Double(n) / sr)
    var pico: Float = 0, suma: Double = 0, cruces = 0, prev: Float = 0
    var mejorE: Double = 0, mejorI = 0, eVentana: Double = 0
    var energias: [Double] = []
    energias.reserveCapacity(n / ventana + 1)
    for i in 0..<n {
      var s: Float = 0
      for c in 0..<nc { s += canales[c][i] }
      s /= Float(nc)
      let a = abs(s)
      if a > pico { pico = a }
      suma += Double(s * s)
      if (s >= 0) != (prev >= 0) { cruces += 1 }
      prev = s
      eVentana += Double(s * s)
      if (i + 1) % ventana == 0 {
        energias.append(eVentana)
        if eVentana > mejorE { mejorE = eVentana; mejorI = energias.count - 1 }
        eVentana = 0
      }
    }
    m.pico = pico > 0 ? 20 * log10(Double(pico)) : -120
    let rms = sqrt(suma / Double(n))
    m.rms = rms > 0 ? 20 * log10(rms) : -120
    m.golpe = Double(mejorI * ventana) / sr
    let umbral = 0.9 * mejorE
    m.ataque = Double((energias.firstIndex { $0 >= umbral } ?? 0) * ventana) / sr
    m.brillo = Double(cruces) / max(m.duracion, 0.001)
    return m
  }
}

let extensiones: Set<String> = ["wav", "aif", "aiff", "mp3", "m4a", "flac", "caf", "ogg"]
let en = FileManager.default.enumerator(at: sonidos, includingPropertiesForKeys: nil)!
var ins: OpaquePointer?
sqlite3_prepare_v2(db, """
INSERT OR REPLACE INTO sonidos (ruta, fuente, categoria, nombre, etiquetas, duracion, pico_db, rms_db, golpe, ataque, brillo, medido)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
""", -1, &ins, nil)
ejecutar("BEGIN")
var nuevos = 0, sinMedir = 0
for case let url as URL in en where extensiones.contains(url.pathExtension.lowercased()) {
  let rel = String(url.path.dropFirst(sonidos.path.count + 1))
  if existentes.contains(rel) { continue }
  let partes = rel.split(separator: "/").map(String.init)
  let fuente = partes.first ?? ""
  let categoria = partes.count > 2 ? partes[1] : ""
  let nombre = url.deletingPathExtension().lastPathComponent
  let etiquetas = (partes.dropLast() + [nombre]).joined(separator: " ")
    .replacingOccurrences(of: "[_\\-.]+", with: " ", options: .regularExpression).lowercased()
  let m = url.pathExtension.lowercased() == "ogg" ? nil : medir(url)
  if m == nil { sinMedir += 1 }
  let textos = [rel, fuente, categoria, nombre, etiquetas]
  for (k, t) in textos.enumerated() { sqlite3_bind_text(ins, Int32(k + 1), t, -1, SQLITE_TRANSIENT) }
  if let m = m {
    for (k, v) in [m.duracion, m.pico, m.rms, m.golpe, m.ataque, m.brillo].enumerated() { sqlite3_bind_double(ins, Int32(k + 6), v) }
  } else {
    for k in 6...11 { sqlite3_bind_null(ins, Int32(k)) }
  }
  sqlite3_bind_text(ins, 12, ISO8601DateFormatter().string(from: Date()), -1, SQLITE_TRANSIENT)
  sqlite3_step(ins)
  sqlite3_reset(ins)
  nuevos += 1
  if nuevos % 500 == 0 { print("…", nuevos) }
}
ejecutar("COMMIT")
sqlite3_finalize(ins)
var st: OpaquePointer?
sqlite3_prepare_v2(db, "SELECT COUNT(*), COUNT(duracion) FROM sonidos", -1, &st, nil)
sqlite3_step(st)
print("nuevos: \(nuevos) (sin medir: \(sinMedir)) · en el catálogo: \(sqlite3_column_int(st, 0)) · medidos: \(sqlite3_column_int(st, 1))")
sqlite3_finalize(st)
sqlite3_close(db)
