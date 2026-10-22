// uso: swift herramientas/inspeccionar.swift <carpeta> <salida.png>
// Mide cada video (resolución, fps, duración, audio, rotación) y arma una hoja de contactos: 3 cuadros por toma
// (inicio, medio, final) con el nombre, para ver de un vistazo qué hay grabado.
import AVFoundation
import AppKit

let args = CommandLine.arguments
let carpeta = URL(fileURLWithPath: args[1])
let salida = URL(fileURLWithPath: args[2])
let archivos = try FileManager.default.contentsOfDirectory(at: carpeta, includingPropertiesForKeys: nil)
  .filter { ["mov", "mp4", "m4v"].contains($0.pathExtension.lowercased()) }.sorted { $0.lastPathComponent < $1.lastPathComponent }

let anchoCuadro = 320.0, altoCuadro = 180.0, etiqueta = 34.0 // cuadro horizontal; lo vertical se dibuja centrado sin deformar
let cols = 3, porFila = 3
let filas = Int(ceil(Double(archivos.count) / Double(porFila)))
let W = Double(porFila) * (Double(cols) * anchoCuadro + 24), H = Double(filas) * (altoCuadro + etiqueta + 16)
let img = NSImage(size: NSSize(width: W, height: H))
img.lockFocus()
NSColor(white: 0.08, alpha: 1).setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.monospacedSystemFont(ofSize: 13, weight: .medium), .foregroundColor: NSColor.white]

for (k, url) in archivos.enumerated() {
  autoreleasepool {
    let asset = AVURLAsset(url: url)
    let dur = CMTimeGetSeconds(asset.duration)
    let pista = asset.tracks(withMediaType: .video).first
    let tam = pista.map { $0.naturalSize.applying($0.preferredTransform) } ?? .zero
    let fps = pista?.nominalFrameRate ?? 0
    let audio = !asset.tracks(withMediaType: .audio).isEmpty
    print("\(url.lastPathComponent)\t\(Int(abs(tam.width)))x\(Int(abs(tam.height)))\t\(String(format: "%.1f", fps)) fps\t\(String(format: "%.1f", dur)) s\taudio:\(audio)")
    let gen = AVAssetImageGenerator(asset: asset)
    gen.appliesPreferredTrackTransform = true
    gen.maximumSize = CGSize(width: anchoCuadro * 2, height: altoCuadro * 2)
    let fila = k / porFila, col = k % porFila
    let x0 = Double(col) * (Double(cols) * anchoCuadro + 24) + 12
    let y0 = H - Double(fila + 1) * (altoCuadro + etiqueta + 16)
    for (j, f) in [0.1, 0.5, 0.9].enumerated() {
      if let cg = try? gen.copyCGImage(at: CMTime(seconds: dur * f, preferredTimescale: 600), actualTime: nil) {
        // Respeta la proporción real (antes se estiraba todo a un cuadro fijo y confundía horizontal con vertical).
        let esc = min((anchoCuadro - 4) / Double(cg.width), altoCuadro / Double(cg.height))
        let w = Double(cg.width) * esc, h = Double(cg.height) * esc
        NSImage(cgImage: cg, size: .zero).draw(in: NSRect(x: x0 + Double(j) * anchoCuadro + (anchoCuadro - 4 - w) / 2, y: y0 + (altoCuadro - h) / 2, width: w, height: h))
      }
    }
    let texto = "\(url.deletingPathExtension().lastPathComponent)  \(String(format: "%.1f", dur))s  \(Int(fps))fps\(audio ? "" : " sin audio")"
    (texto as NSString).draw(at: NSPoint(x: x0, y: y0 + altoCuadro + 8), withAttributes: attrs)
  }
}
img.unlockFocus()
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try rep.representation(using: .png, properties: [:])!.write(to: salida)
print("hoja:", salida.path)
