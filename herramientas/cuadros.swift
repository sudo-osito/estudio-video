// uso: swift herramientas/cuadros.swift <video> <salida.png> [t1,t2,…]   → hoja con cuadros en esos segundos (o 16 repartidos)
import AVFoundation
import AppKit
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let dur = CMTimeGetSeconds(asset.duration)
let tiempos = a.count > 3 ? a[3].split(separator: ",").compactMap { Double($0) } : (0..<16).map { dur * (Double($0) + 0.5) / 16 }
let gen = AVAssetImageGenerator(asset: asset); gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 640, height: 640)
let cols = 4, filas = Int(ceil(Double(tiempos.count) / Double(cols)))
let primero = try gen.copyCGImage(at: CMTime(seconds: tiempos[0], preferredTimescale: 600), actualTime: nil)
let cw = Double(primero.width), ch = Double(primero.height)
let img = NSImage(size: NSSize(width: cw * Double(cols), height: (ch + 24) * Double(filas)))
img.lockFocus(); NSColor(white: 0.12, alpha: 1).setFill(); NSRect(origin: .zero, size: img.size).fill()
for (i, t) in tiempos.enumerated() {
  autoreleasepool {
    guard let cg = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) else { return }
    let x = Double(i % cols) * cw, y = img.size.height - Double(i / cols + 1) * (ch + 24)
    NSImage(cgImage: cg, size: .zero).draw(in: NSRect(x: x, y: y, width: cw, height: ch))
    (String(format: "%.1f s", t) as NSString).draw(at: NSPoint(x: x + 6, y: y + ch + 4), withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 13, weight: .medium), .foregroundColor: NSColor.white])
  }
}
img.unlockFocus()
try NSBitmapImageRep(data: img.tiffRepresentation!)!.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[2]))
print("hoja:", a[2], "· duración", dur)
