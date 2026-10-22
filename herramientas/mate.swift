// uso: swift herramientas/mate.swift <video> <salida.mov>
// Máscara de la persona cuadro a cuadro (Vision, calidad «accurate») como video en escala de grises: blanco = persona.
// En After Effects se usa como mate de luminancia para poner texto o gráficos DETRÁS de Max.
// Lecciones de Howden: Vision recicla su búfer → se copia la máscara en cada cuadro; todo dentro de autoreleasepool.
import AVFoundation
import CoreImage
import Vision

let args = CommandLine.arguments
let entrada = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let salida = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: salida)

let pista = entrada.tracks(withMediaType: .video)[0]
let t = pista.preferredTransform
let visible = CGRect(origin: .zero, size: pista.naturalSize).applying(t)
let W = Int(abs(visible.width)), H = Int(abs(visible.height))

let lector = try AVAssetReader(asset: entrada)
let salidaLector = AVAssetReaderTrackOutput(track: pista, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
lector.add(salidaLector)
lector.startReading()

let escritor = try AVAssetWriter(outputURL: salida, fileType: .mov)
let entradaEsc = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.hevc, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoQualityKey: 0.95],
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
])
let adaptador = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: entradaEsc, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
escritor.add(entradaEsc)
escritor.startWriting()
escritor.startSession(atSourceTime: .zero)

let ctx = CIContext()
let pedido = VNGeneratePersonSegmentationRequest()
pedido.qualityLevel = .accurate
pedido.outputPixelFormat = kCVPixelFormatType_OneComponent8
// Orientación de la toma (las frontales del iPhone vienen rotadas 180°).
let angulo = atan2(t.b, t.a) * 180 / .pi
let orient: CGImagePropertyOrientation = abs(angulo - 180) < 1 || abs(angulo + 180) < 1 ? .down : abs(angulo - 90) < 1 ? .right : abs(angulo + 90) < 1 ? .left : .up

var n = 0
while let muestra = salidaLector.copyNextSampleBuffer() {
  autoreleasepool {
    guard let px = CMSampleBufferGetImageBuffer(muestra) else { return }
    let tiempo = CMSampleBufferGetPresentationTimeStamp(muestra)
    try? VNImageRequestHandler(cvPixelBuffer: px, orientation: orient).perform([pedido])
    guard let mascara = pedido.results?.first?.pixelBuffer else { return }
    // Copia inmediata (Vision reutiliza el búfer) y escala a la imagen visible.
    let m = CIImage(cvPixelBuffer: mascara)
    let gris = m.applyingFilter("CIColorMatrix", parameters: ["inputRVector": CIVector(x: 1, y: 0, z: 0, w: 0), "inputGVector": CIVector(x: 1, y: 0, z: 0, w: 0), "inputBVector": CIVector(x: 1, y: 0, z: 0, w: 0), "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1)])
      .transformed(by: CGAffineTransform(scaleX: CGFloat(W) / m.extent.width, y: CGFloat(H) / m.extent.height))
    var destino: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptador.pixelBufferPool!, &destino)
    ctx.render(gris, to: destino!)
    while !entradaEsc.isReadyForMoreMediaData { usleep(2000) }
    adaptador.append(destino!, withPresentationTime: tiempo)
    n += 1
  }
}
entradaEsc.markAsFinished()
let listo = DispatchSemaphore(value: 0)
escritor.finishWriting { listo.signal() }
listo.wait()
print("mate: \(n) cuadros \(W)x\(H) → \(salida.path)")
