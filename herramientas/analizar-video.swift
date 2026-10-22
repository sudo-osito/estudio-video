// uso: swift herramientas/analizar-video.swift <video> <carpeta-salida>
// Análisis cuadro a cuadro de un video de referencia:
//   · metricas.json  → por cuadro: brillo, saturación, contraste, diferencia con el anterior (detector de cortes),
//                      desplazamiento global dx/dy (paneos, whips) y escala estimada (acercamientos)
//   · cortes.json    → cortes detectados (picos de diferencia) con su tipo probable
//   · general-N.png  → hoja de contactos a 4 cuadros por segundo con el segundo de cada uno
//   · corte-K.png    → los 4 cuadros antes y después de cada corte, a cuadro completo, para ver la transición
import AVFoundation
import AppKit
import CoreImage

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let salida = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: salida, withIntermediateDirectories: true)
let asset = AVURLAsset(url: url)
let pista = asset.tracks(withMediaType: .video)[0]
let fps = Double(pista.nominalFrameRate)
let dur = CMTimeGetSeconds(asset.duration)

// ── 1 · Métricas por cuadro (a 96 px de ancho, gris + color) ──
let A = 96
struct Cuadro { var t: Double; var brillo: Double; var sat: Double; var contraste: Double; var dif: Double; var dx: Double; var dy: Double; var escala: Double }
var cuadros: [Cuadro] = []
var miniaturas: [CGImage] = []   // una cada cuadro, chica, para las hojas de cortes no: esas se sacan a tamaño completo después
let lector = try AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: pista, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
lector.add(out); lector.startReading()
let ctx = CIContext()
var anterior: [Float] = []
var H = 0
func gris(_ px: CVPixelBuffer) -> ([Float], Double, Double, Double) {
  let ci = CIImage(cvPixelBuffer: px)
  let k = CGFloat(A) / ci.extent.width
  let chica = ci.transformed(by: CGAffineTransform(scaleX: k, y: k))
  H = Int(chica.extent.height.rounded())
  var buf = [UInt8](repeating: 0, count: A * H * 4)
  ctx.render(chica, toBitmap: &buf, rowBytes: A * 4, bounds: CGRect(x: 0, y: 0, width: A, height: H), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
  var g = [Float](repeating: 0, count: A * H); var sumS = 0.0, sumY = 0.0, sumY2 = 0.0
  for i in 0..<(A * H) {
    let r = Double(buf[i * 4]) / 255, gg = Double(buf[i * 4 + 1]) / 255, b = Double(buf[i * 4 + 2]) / 255
    let y = 0.2126 * r + 0.7152 * gg + 0.0722 * b
    let mx = max(r, gg, b), mn = min(r, gg, b)
    g[i] = Float(y); sumY += y; sumY2 += y * y; sumS += mx > 0 ? (mx - mn) / mx : 0
  }
  let n = Double(A * H); let m = sumY / n
  return (g, m, sumS / n, sqrt(max(0, sumY2 / n - m * m)))
}
// Desplazamiento global: búsqueda de la mejor traslación (±6 px a 96 px de ancho) y escala (0,94–1,06).
func mover(_ a: [Float], _ b: [Float]) -> (Double, Double, Double, Double) {
  var mejor = (Double.infinity, 0.0, 0.0, 1.0)
  let cx = Double(A) / 2, cy = Double(H) / 2
  for s in [0.94, 0.97, 1.0, 1.03, 1.06] {
    for dy in stride(from: -6, through: 6, by: 2) { for dx in stride(from: -6, through: 6, by: 2) {
      var e = 0.0, n = 0
      for y in stride(from: 8, to: H - 8, by: 2) { for x in stride(from: 8, to: A - 8, by: 2) {
        let sx = Int(((Double(x) - cx) * s + cx).rounded()) + dx, sy = Int(((Double(y) - cy) * s + cy).rounded()) + dy
        if sx < 0 || sy < 0 || sx >= A || sy >= H { continue }
        let d = Double(a[y * A + x] - b[sy * A + sx]); e += d * d; n += 1
      } }
      if n > 0 && e / Double(n) < mejor.0 { mejor = (e / Double(n), Double(dx), Double(dy), s) }
    } }
  }
  return (sqrt(mejor.0), mejor.1, mejor.2, mejor.3)
}
while let m = out.copyNextSampleBuffer() {
  autoreleasepool {
    guard let px = CMSampleBufferGetImageBuffer(m) else { return }
    let t = CMSampleBufferGetPresentationTimeStamp(m).seconds
    let (g, br, sat, con) = gris(px)
    var c = Cuadro(t: t, brillo: br, sat: sat, contraste: con, dif: 0, dx: 0, dy: 0, escala: 1)
    if !anterior.isEmpty {
      var d = 0.0; for i in 0..<g.count { d += Double(abs(g[i] - anterior[i])) }
      c.dif = d / Double(g.count)
      let (_, dx, dy, s) = mover(anterior, g); c.dx = dx; c.dy = dy; c.escala = s
    }
    anterior = g; cuadros.append(c)
  }
}

// ── 2 · Cortes: diferencia muy por encima de la mediana local ──
var cortes: [[String: Any]] = []
for i in 1..<cuadros.count {
  let ventana = cuadros[max(1, i - 8)..<min(cuadros.count, i + 8)].map { $0.dif }.sorted()
  let med = ventana[ventana.count / 2]
  if cuadros[i].dif > max(0.08, med * 3.2) && (cortes.last.map { abs(($0["t"] as! Double) - cuadros[i].t) > 0.12 } ?? true) {
    let brillo = cuadros[i].brillo
    let tipo = brillo < 0.04 ? "a negro" : brillo > 0.9 ? "destello" : abs(cuadros[i - 1].dx) >= 4 ? "whip/barrido" : "corte"
    cortes.append(["t": cuadros[i].t, "cuadro": i, "dif": cuadros[i].dif, "tipo": tipo])
  }
}
let enc = JSONSerialization.self
try enc.data(withJSONObject: ["video": url.lastPathComponent, "fps": fps, "duracion": dur, "cuadros": cuadros.map { ["t": $0.t, "brillo": $0.brillo, "sat": $0.sat, "contraste": $0.contraste, "dif": $0.dif, "dx": $0.dx, "dy": $0.dy, "escala": $0.escala] }], options: []).write(to: salida.appendingPathComponent("metricas.json"))
try enc.data(withJSONObject: cortes, options: [.prettyPrinted]).write(to: salida.appendingPathComponent("cortes.json"))

// ── 3 · Hojas ──
let gen = AVAssetImageGenerator(asset: asset); gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
func hoja(_ tiempos: [Double], _ ancho: Double, _ cols: Int, _ archivo: String, _ etiqueta: (Double) -> String) {
  gen.maximumSize = CGSize(width: ancho, height: ancho * 2)
  var imgs: [(Double, CGImage)] = []
  for t in tiempos { if let cg = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) { imgs.append((t, cg)) } }
  guard let p = imgs.first else { return }
  let cw = Double(p.1.width), ch = Double(p.1.height), filas = Int(ceil(Double(imgs.count) / Double(cols)))
  let img = NSImage(size: NSSize(width: cw * Double(cols), height: (ch + 20) * Double(filas)))
  img.lockFocus(); NSColor.black.setFill(); NSRect(origin: .zero, size: img.size).fill()
  for (i, (t, cg)) in imgs.enumerated() {
    let x = Double(i % cols) * cw, y = img.size.height - Double(i / cols + 1) * (ch + 20)
    NSImage(cgImage: cg, size: .zero).draw(in: NSRect(x: x, y: y, width: cw - 2, height: ch))
    (etiqueta(t) as NSString).draw(at: NSPoint(x: x + 4, y: y + ch + 3), withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 11, weight: .bold), .foregroundColor: NSColor.white])
  }
  img.unlockFocus()
  try? NSBitmapImageRep(data: img.tiffRepresentation!)!.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!.write(to: salida.appendingPathComponent(archivo))
}
let paso = 0.25, porHoja = 48
let todos = Array(stride(from: 0.0, to: dur, by: paso))
for (n, desde) in stride(from: 0, to: todos.count, by: porHoja).enumerated() {
  hoja(Array(todos[desde..<min(todos.count, desde + porHoja)]), 300, 8, "general-\(n + 1).jpg") { String(format: "%.2f s", $0) }
}
for (k, c) in cortes.enumerated() {
  let t = c["t"] as! Double, f = 1 / fps
  hoja((-4...3).map { t + Double($0) * f }, 420, 4, "corte-\(k + 1).jpg") { String(format: "%.3f s", $0) }
}
print("\(url.lastPathComponent): \(String(format: "%.1f", dur)) s a \(fps) fps · \(cuadros.count) cuadros · \(cortes.count) cortes · hojas: \(Int(ceil(Double(todos.count) / Double(porHoja))))")
