// Heika para el Mac: una ventana nativa con la página de Heika adentro, la animación de entrada
// y lo que la web no puede hacer: oír la voz sin internet (SpeechAnalyzer), mantener la pantalla encendida
// y esconder la ventana de las grabaciones de pantalla mientras está el teleprompter.
//
// Se compila con mac/construir.sh (solo swiftc, sin Xcode).
// Pruebas sin abrir ventanas al frente:
//   HEIKA_OIR_ARCHIVO=voz.aiff  → transcribe el archivo y lo imprime (prueba del oído)
//   HEIKA_CAPTURA=carpeta       → guarda cuadros de la animación y una foto de la página, y se cierra

import AppKit
import AVFoundation
import IOKit.pwr_mgt
import Speech
import WebKit

let URL_HEIKA = URL(string: ProcessInfo.processInfo.environment["HEIKA_URL"] ?? "https://sudo-osito.github.io/estudio-video/")!
let FONDO = NSColor(srgbRed: 0xf6 / 255, green: 0xf3 / 255, blue: 0xf1 / 255, alpha: 1)
let TINTA = NSColor(srgbRed: 0x0b / 255, green: 0x0b / 255, blue: 0x0c / 255, alpha: 1)
// El degradado de la marca, muestreado de la referencia
let DEGRADADO: [(CGFloat, UInt32)] = [(0, 0xeb7c60), (0.14, 0xfc3e40), (0.35, 0xff0042), (0.48, 0xfe0428), (0.6, 0xfd5731), (0.74, 0xfe9e74), (0.86, 0xf0b8b0), (1, 0xdcbccb)]

func color(_ hex: UInt32) -> CGColor {
    CGColor(srgbRed: CGFloat((hex >> 16) & 0xff) / 255, green: CGFloat((hex >> 8) & 0xff) / 255, blue: CGFloat(hex & 0xff) / 255, alpha: 1)
}

// MARK: - La H (mismas medidas que el SVG: viewBox de 100)

enum Marca {
    static func izquierda() -> CGPath {
        let p = CGMutablePath()
        p.move(to: CGPoint(x: 10, y: 92)); p.addLine(to: CGPoint(x: 10, y: 40))
        p.addArc(tangent1End: CGPoint(x: 10, y: 8), tangent2End: CGPoint(x: 42, y: 8), radius: 32)
        p.addLine(to: CGPoint(x: 42, y: 92)); p.closeSubpath()
        return p
    }
    static func derecha() -> CGPath {
        let p = CGMutablePath()
        p.move(to: CGPoint(x: 90, y: 8)); p.addLine(to: CGPoint(x: 90, y: 60))
        p.addArc(tangent1End: CGPoint(x: 90, y: 92), tangent2End: CGPoint(x: 58, y: 92), radius: 32)
        p.addLine(to: CGPoint(x: 58, y: 8)); p.closeSubpath()
        return p
    }
    static let cruz = CGRect(x: 41, y: 39, width: 18, height: 22)
}

// MARK: - Animación de entrada (es la única pantalla de carga)
// Sobre negro: un tallo cae, el otro sube y el travesaño se estira con rebote. Debajo, una barra con el degradado
// muestra la carga de verdad. Cuando la página está lista, la H vuela a su lugar en la barra lateral, se vuelve negra
// y el fondo se disuelve: no hay una segunda pantalla de carga.

final class Arranque: NSView {
    private var t0 = CACurrentMediaTime()
    private var tVuelo: Double?
    private var reloj: Timer?
    private var mostrado: Double = 0           // avance de la barra que se ve (persigue al real, suave)
    var tFijo: Double?                          // para dibujar un instante exacto (pruebas)
    var avance: Double = 0                      // 0–1: cuánto cargó la página
    var destino: CGRect?                        // dónde aterriza la H (caja de 100×100 del logo de la página)
    var lista = false
    var alTerminar: (() -> Void)?

    static let armado = 0.9
    static let vuelo = 0.85

    override var isFlipped: Bool { true }

    func empezar() {
        t0 = CACurrentMediaTime()
        let r = Timer(timeInterval: 1 / 120, repeats: true) { [weak self] _ in self?.cuadro() }
        RunLoop.main.add(r, forMode: .common)
        reloj = r
        // Si la página no avisa, igual se entra (solo se disuelve)
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in self?.lista = true }
    }

    private var ahora: Double { CACurrentMediaTime() - t0 }

    private func cuadro() {
        let meta = lista ? 1 : min(0.92, avance)
        mostrado += (meta - mostrado) * (lista ? 0.16 : 0.06)
        if tVuelo == nil, lista, ahora >= Arranque.armado, mostrado > 0.97 { tVuelo = ahora }
        if let v = tVuelo, ahora - v >= Arranque.vuelo {
            reloj?.invalidate(); reloj = nil
            alTerminar?()
            return
        }
        needsDisplay = true
    }

    override func mouseDown(with event: NSEvent) { if lista { mostrado = 1 } }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        let t = tFijo ?? ahora
        let vuelo = tVuelo.map { (t - $0) / Arranque.vuelo } ?? 0
        Arranque.dibujar(ctx, tamano: bounds.size, t: t, barra: mostrado, vuelo: vuelo, destino: destino)
    }

    static func dibujar(_ ctx: CGContext, tamano: CGSize, t: Double, barra: Double, vuelo: Double, destino: CGRect?) {
        let W = tamano.width, H = tamano.height
        let u = clamp(vuelo)
        let fondo = 1 - suave(clamp((u - 0.12) / 0.7))
        ctx.saveGState()
        ctx.setFillColor(color(0x0b0b0c).copy(alpha: fondo)!)
        ctx.fill(CGRect(origin: .zero, size: tamano))

        // La H: al centro mientras carga; en el vuelo va hacia el logo de la barra lateral
        let lado = min(132, max(92, min(W, H) * 0.15))
        let desde = CGRect(x: W / 2 - lado / 2, y: H / 2 - lado / 2 - 18, width: lado, height: lado)
        let hasta = destino ?? desde.insetBy(dx: lado * 0.1, dy: lado * 0.1)
        let m = suave(u)
        let caja = CGRect(x: desde.minX + (hasta.minX - desde.minX) * m, y: desde.minY + (hasta.minY - desde.minY) * m,
                          width: desde.width + (hasta.width - desde.width) * m, height: desde.height + (hasta.height - desde.height) * m)
        let k = caja.width / 100
        let gris = 1 - (1 - 0.043) * suave(clamp((u - 0.25) / 0.6)) // blanco → tinta
        let alfaH: CGFloat = destino == nil ? 1 - m : 1

        // La barra de carga, centrada bajo la H; se apaga al despegar
        let alfaBarra = CGFloat(clamp((t - 0.45) / 0.3)) * (1 - CGFloat(clamp(u / 0.2)))
        if alfaBarra > 0 {
            let ancho: CGFloat = 220, alto: CGFloat = 3
            let pista = CGRect(x: W / 2 - ancho / 2, y: desde.maxY + 40, width: ancho, height: alto)
            ctx.saveGState()
            ctx.setAlpha(alfaBarra)
            ctx.addPath(CGPath(roundedRect: pista, cornerWidth: 1.5, cornerHeight: 1.5, transform: nil))
            ctx.setFillColor(CGColor(gray: 1, alpha: 0.12)); ctx.fillPath()
            let lleno = CGRect(x: pista.minX, y: pista.minY, width: ancho * CGFloat(min(1, max(0, barra))), height: alto)
            ctx.addPath(CGPath(roundedRect: lleno, cornerWidth: 1.5, cornerHeight: 1.5, transform: nil)); ctx.clip()
            let srgb = CGColorSpace(name: CGColorSpace.sRGB)
            let gradiente = CGGradient(colorsSpace: srgb, colors: DEGRADADO.map { color($0.1) } as CFArray, locations: DEGRADADO.map { $0.0 })!
            ctx.drawLinearGradient(gradiente, start: CGPoint(x: pista.minX, y: 0), end: CGPoint(x: pista.maxX, y: 0), options: [])
            ctx.restoreGState()
        }

        ctx.setFillColor(CGColor(gray: gris, alpha: 1))
        func pieza(_ camino: CGPath, dy: CGFloat, alfa: CGFloat) {
            guard alfa > 0 else { return }
            ctx.saveGState()
            ctx.setAlpha(alfa * alfaH)
            ctx.translateBy(x: caja.minX, y: caja.minY + dy * k)
            ctx.scaleBy(x: k, y: k)
            ctx.addPath(camino); ctx.fillPath()
            ctx.restoreGState()
        }
        let pi = salir(clamp(t / 0.62)), pd = salir(clamp((t - 0.06) / 0.62))
        pieza(Marca.izquierda(), dy: -40 * (1 - pi), alfa: CGFloat(min(1, pi * 1.6)))
        pieza(Marca.derecha(), dy: 40 * (1 - pd), alfa: CGFloat(min(1, pd * 1.6)))
        let pc = resorte(clamp((t - 0.3) / 0.6))
        if pc > 0 {
            let c = Marca.cruz
            let ancho = c.width * pc
            ctx.saveGState(); ctx.setAlpha(alfaH)
            ctx.fill(CGRect(x: caja.minX + (c.midX - ancho / 2) * k, y: caja.minY + c.minY * k, width: ancho * k, height: c.height * k))
            ctx.restoreGState()
        }
        ctx.restoreGState()
    }

    static func clamp(_ x: Double) -> Double { min(1, max(0, x)) }
    static func salir(_ x: Double) -> CGFloat { CGFloat(1 - pow(1 - x, 4)) }
    static func suave(_ x: Double) -> CGFloat { CGFloat(x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2) }
    static func resorte(_ x: Double) -> CGFloat { x <= 0 ? 0 : CGFloat(1 - exp(-6 * x) * cos(10 * x)) }
}

// MARK: - Franja para mover la ventana (la barra de título es transparente y la página llega hasta arriba)

final class Asa: NSView {
    override func mouseDown(with event: NSEvent) {
        if event.clickCount == 2 { window?.performZoom(nil) } else { window?.performDrag(with: event) }
    }
}

// MARK: - El oído: transcribe el micrófono sin internet y le manda el texto a la página

final class Oido {
    var enviar: (String, [String: Any]) -> Void = { _, _ in }
    private var analizador: SpeechAnalyzer?
    private let motor = AVAudioEngine()
    private var entrada: AsyncStream<AnalyzerInput>.Continuation?
    private var lectura: Task<Void, Never>?
    private var ultimoNivel = CACurrentMediaTime()

    static func transcriptor() async -> SpeechTranscriber {
        let idioma = await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: "es-CL")) ?? Locale(identifier: "es-ES")
        return SpeechTranscriber(locale: idioma, transcriptionOptions: [], reportingOptions: [.volatileResults], attributeOptions: [])
    }

    /// Baja el modelo de español la primera vez (lo maneja macOS; después funciona sin internet)
    static func instalarModelo(_ t: SpeechTranscriber, progreso: @escaping (Double) -> Void) async throws {
        guard let pedido = try await AssetInventory.assetInstallationRequest(supporting: [t]) else { return }
        let observador = pedido.progress.observe(\.fractionCompleted) { p, _ in progreso(p.fractionCompleted) }
        defer { observador.invalidate() }
        try await pedido.downloadAndInstall()
    }

    func empezar(frases: [String]) {
        Task { @MainActor in
            do {
                guard await AVCaptureDevice.requestAccess(for: .audio) else {
                    enviar("oido-error", ["mensaje": "Heika no tiene permiso para el micrófono. Actívalo en Ajustes del Sistema → Privacidad → Micrófono."])
                    return
                }
                let t = await Oido.transcriptor()
                enviar("oido-estado", ["estado": "preparando"])
                try await Oido.instalarModelo(t) { p in DispatchQueue.main.async { self.enviar("oido-estado", ["estado": "descargando", "progreso": p]) } }
                let a = SpeechAnalyzer(modules: [t])
                let contexto = AnalysisContext()
                contexto.contextualStrings[.general] = frases // las palabras del guion pesan más
                try await a.setContext(contexto)
                let natural = motor.inputNode.outputFormat(forBus: 0)
                guard let formato = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [t], considering: natural) else {
                    enviar("oido-error", ["mensaje": "No encontré un formato de audio para el micrófono."]); return
                }
                try await a.prepareToAnalyze(in: formato)
                let (flujo, continuacion) = AsyncStream<AnalyzerInput>.makeStream()
                entrada = continuacion
                analizador = a
                try conectarMicrofono(de: natural, a: formato, continuacion)
                try await a.start(inputSequence: flujo)
                enviar("oido-estado", ["estado": "escuchando"])
                lectura = Task {
                    do {
                        for try await r in t.results {
                            let texto = String(r.text.characters)
                            await MainActor.run { self.enviar("oido", ["texto": texto, "final": r.isFinal]) }
                        }
                    } catch {
                        await MainActor.run { self.enviar("oido-error", ["mensaje": error.localizedDescription]) }
                    }
                }
            } catch {
                enviar("oido-error", ["mensaje": "No pude empezar a escuchar: \(error.localizedDescription)"])
                callar()
            }
        }
    }

    private func conectarMicrofono(de natural: AVAudioFormat, a formato: AVAudioFormat, _ c: AsyncStream<AnalyzerInput>.Continuation) throws {
        let convertidor = natural == formato ? nil : AVAudioConverter(from: natural, to: formato)
        motor.inputNode.installTap(onBus: 0, bufferSize: 4096, format: natural) { [weak self] buf, _ in
            self?.medir(buf)
            guard let convertidor else { c.yield(AnalyzerInput(buffer: buf)); return }
            let cabe = AVAudioFrameCount(Double(buf.frameLength) * formato.sampleRate / natural.sampleRate + 64)
            guard let salida = AVAudioPCMBuffer(pcmFormat: formato, frameCapacity: cabe) else { return }
            var entregado = false
            var error: NSError?
            convertidor.convert(to: salida, error: &error) { _, estado in
                if entregado { estado.pointee = .noDataNow; return nil }
                entregado = true; estado.pointee = .haveData; return buf
            }
            if error == nil, salida.frameLength > 0 { c.yield(AnalyzerInput(buffer: salida)) }
        }
        motor.prepare()
        try motor.start()
    }

    /// Nivel del micrófono (0–1) unas 15 veces por segundo, para el medidor del teleprompter
    private func medir(_ buf: AVAudioPCMBuffer) {
        let ahora = CACurrentMediaTime()
        guard ahora - ultimoNivel > 0.066, let datos = buf.floatChannelData?[0] else { return }
        ultimoNivel = ahora
        var suma: Float = 0
        for i in 0..<Int(buf.frameLength) { suma += datos[i] * datos[i] }
        let rms = sqrt(suma / Float(max(1, buf.frameLength)))
        let nivel = min(1, max(0, (20 * log10(max(rms, 1e-6)) + 55) / 45)) // −55 dB → 0, −10 dB → 1
        DispatchQueue.main.async { self.enviar("oido-nivel", ["nivel": Double(nivel)]) }
    }

    func callar() {
        if motor.isRunning { motor.stop() }
        motor.inputNode.removeTap(onBus: 0)
        entrada?.finish(); entrada = nil
        let a = analizador; analizador = nil
        Task { try? await a?.finalizeAndFinishThroughEndOfInput() }
        lectura?.cancel(); lectura = nil
    }

    /// Prueba sin micrófono: transcribe un archivo de audio e imprime cada resultado
    static func probarArchivo(_ ruta: String) async {
        do {
            let t = await transcriptor()
            try await instalarModelo(t) { p in print("modelo \(Int(p * 100)) %") }
            let archivo = try AVAudioFile(forReading: URL(fileURLWithPath: ruta))
            let lector = Task {
                for try await r in t.results { print((r.isFinal ? "FINAL " : "volátil ") + String(r.text.characters)) }
            }
            let a = try await SpeechAnalyzer(inputAudioFile: archivo, modules: [t], finishAfterFile: true)
            _ = a
            try await lector.value
        } catch { print("ERROR \(error)") }
    }
}

// MARK: - La app

final class App: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    var ventana: NSWindow!
    var web: WKWebView!
    var arranque: Arranque!
    let oido = Oido()
    var candado: IOPMAssertionID = 0
    let captura = ProcessInfo.processInfo.environment["HEIKA_CAPTURA"]
    var progreso: NSKeyValueObservation?

    /// La H llegó a su lugar: la página muestra su logo y las cargas siguientes ya no lo esconden
    func aterrizo() {
        arranque?.removeFromSuperview(); arranque = nil
        progreso = nil
        js("document.documentElement.classList.remove('aterrizando')")
        let c = web.configuration.userContentController
        c.removeAllUserScripts()
        c.addUserScript(WKUserScript(source: "document.documentElement.classList.add('nativo');", injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    func applicationDidFinishLaunching(_ n: Notification) {
        armarMenus()
        let config = WKWebViewConfiguration()
        let usuario = WKUserContentController()
        usuario.add(self, name: "heika")
        // La página sabe que vive en el Mac: deja espacio a los semáforos y habilita la voz
        // La primera carga además esconde la H del logo de la página: la H nativa aterriza ahí
        usuario.addUserScript(WKUserScript(source: "document.documentElement.classList.add('nativo','aterrizando');", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        if captura != nil, let llave = ProcessInfo.processInfo.environment["HEIKA_LLAVE"] { // solo en pruebas
            usuario.addUserScript(WKUserScript(source: "localStorage.setItem('estudio:llave', \(String(reflecting: llave)));", injectionTime: .atDocumentStart, forMainFrameOnly: true))
            // una ventana tapada no anima: en la foto se ve el estado final
            usuario.addUserScript(WKUserScript(source: "const e=document.createElement('style');e.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';document.documentElement.append(e);", injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        config.userContentController = usuario
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.mediaTypesRequiringUserActionForPlayback = []

        let marco = NSRect(x: 0, y: 0, width: 1360, height: 860)
        ventana = NSWindow(contentRect: marco, styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        ventana.titlebarAppearsTransparent = true
        ventana.titleVisibility = .hidden
        ventana.title = "Heika"
        ventana.backgroundColor = FONDO
        ventana.minSize = NSSize(width: 960, height: 640)
        ventana.isReleasedWhenClosed = false
        ventana.center()
        ventana.setFrameAutosaveName("Heika")

        let contenido = NSView(frame: marco)
        contenido.autoresizingMask = [.width, .height]
        web = WKWebView(frame: contenido.bounds, configuration: config)
        web.autoresizingMask = [.width, .height]
        web.navigationDelegate = self
        web.uiDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        contenido.addSubview(web)

        let asa = Asa(frame: NSRect(x: 0, y: contenido.bounds.height - 30, width: contenido.bounds.width, height: 30))
        asa.autoresizingMask = [.width, .minYMargin]
        contenido.addSubview(asa)

        arranque = Arranque(frame: contenido.bounds)
        arranque.autoresizingMask = [.width, .height]
        arranque.alTerminar = { [weak self] in self?.aterrizo() }
        progreso = web.observe(\.estimatedProgress) { [weak self] w, _ in self?.arranque?.avance = 0.15 + 0.6 * w.estimatedProgress }
        contenido.addSubview(arranque)
        ventana.contentView = contenido

        oido.enviar = { [weak self] tipo, datos in self?.aLaPagina(tipo, datos) }
        web.load(URLRequest(url: URL_HEIKA))

        if let carpeta = captura { capturar(en: carpeta); return }
        ventana.makeKeyAndOrderFront(nil)
        NSApp.activate()
        arranque.empezar()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ n: Notification) { oido.callar(); pantalla(false) }

    // Página → Mac
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        guard let d = m.body as? [String: Any], let tipo = d["tipo"] as? String else { return }
        switch tipo {
        case "oir": oido.empezar(frases: d["frases"] as? [String] ?? [])
        case "callar": oido.callar()
        case "lista": // la página pintó sus datos (o la entrada) y dice dónde está su logo
            if captura != nil { print("lista:", d["x"] ?? "-", d["y"] ?? "-", d["alto"] ?? "-") }
            if let x = d["x"] as? Double, let y = d["y"] as? Double, let alto = d["alto"] as? Double, alto > 0 {
                arranque?.destino = CGRect(x: x, y: y, width: alto, height: alto)
            }
            arranque?.lista = true
        case "pantalla": pantalla(d["on"] as? Bool ?? false)
        case "privado": ventana.sharingType = (d["on"] as? Bool ?? false) ? .none : .readOnly // el teleprompter no sale en grabaciones de pantalla
        default: break
        }
    }

    // Mac → página
    func aLaPagina(_ tipo: String, _ datos: [String: Any]) {
        guard let json = try? JSONSerialization.data(withJSONObject: datos), let texto = String(data: json, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.heikaNativo && window.heikaNativo.recibir(\(String(reflecting: tipo)), \(texto))")
    }

    func pantalla(_ on: Bool) {
        if on, candado == 0 { IOPMAssertionCreateWithName(kIOPMAssertionTypeNoDisplaySleep as CFString, IOPMAssertionLevel(kIOPMAssertionLevelOn), "Heika: teleprompter" as CFString, &candado) }
        if !on, candado != 0 { IOPMAssertionRelease(candado); candado = 0 }
    }

    func js(_ codigo: String) { web.evaluateJavaScript(codigo) }

    // MARK: Navegación: la app es una sola página; lo demás se abre en el navegador


    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { sinConexion(e) }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { sinConexion(e) }

    func sinConexion(_ e: Error) {
        arranque?.lista = true
        let html = "<body style='margin:0;display:grid;place-items:center;height:100vh;background:#f6f3f1;font:15px -apple-system;color:#0b0b0c'><div style='text-align:center'><h2 style='font-weight:600'>Sin conexión</h2><p style='color:#777'>Heika necesita internet para traer el calendario.</p><button onclick='location.href=\(String(reflecting: URL_HEIKA.absoluteString))' style='font:inherit;padding:10px 18px;border-radius:999px;border:0;background:#0b0b0c;color:#fff'>Reintentar</button></div></body>"
        web.loadHTMLString(html, baseURL: nil)
    }

    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if a.shouldPerformDownload { return decisionHandler(.download) }
        if let url = a.request.url, a.navigationType == .linkActivated || a.targetFrame == nil,
           !(url.host == URL_HEIKA.host && url.path.hasPrefix(URL_HEIKA.path)) {
            NSWorkspace.shared.open(url)
            return decisionHandler(.cancel)
        }
        decisionHandler(.allow)
    }

    func webView(_ w: WKWebView, navigationAction a: WKNavigationAction, didBecome d: WKDownload) { d.delegate = self }
    func webView(_ w: WKWebView, navigationResponse r: WKNavigationResponse, didBecome d: WKDownload) { d.delegate = self }
    func download(_ d: WKDownload, decideDestinationUsing r: URLResponse, suggestedFilename nombre: String) async -> URL? {
        let descargas = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        var destino = descargas.appendingPathComponent(nombre)
        var n = 2
        while FileManager.default.fileExists(atPath: destino.path) {
            destino = descargas.appendingPathComponent("\((nombre as NSString).deletingPathExtension) \(n).\((nombre as NSString).pathExtension)"); n += 1
        }
        return destino
    }
    func downloadDidFinish(_ d: WKDownload) { aLaPagina("aviso", ["texto": "Descargado en Descargas"]) }

    // MARK: Diálogos de la página (sin esto, confirm() siempre dice que no y el «Subir» no abre nada)

    func webView(_ w: WKWebView, runOpenPanelWith p: WKOpenPanelParameters, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = p.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.beginSheetModal(for: ventana) { r in completionHandler(r == .OK ? panel.urls : nil) }
    }
    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = m
        a.beginSheetModal(for: ventana) { _ in completionHandler() }
    }
    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = m
        a.addButton(withTitle: "Aceptar"); a.addButton(withTitle: "Cancelar")
        a.beginSheetModal(for: ventana) { r in completionHandler(r == .alertFirstButtonReturn) }
    }

    // MARK: Menús y atajos

    func armarMenus() {
        let barra = NSMenu()
        func menu(_ titulo: String, _ items: [NSMenuItem]) {
            let m = NSMenu(title: titulo); items.forEach(m.addItem)
            let i = NSMenuItem(); i.submenu = m; barra.addItem(i)
        }
        func item(_ t: String, _ s: Selector?, _ k: String, _ mods: NSEvent.ModifierFlags = .command) -> NSMenuItem {
            let i = NSMenuItem(title: t, action: s, keyEquivalent: k); i.keyEquivalentModifierMask = mods; return i
        }
        menu("Heika", [item("Acerca de Heika", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), ""), .separator(),
                       item("Ocultar Heika", #selector(NSApplication.hide(_:)), "h"), .separator(),
                       item("Salir de Heika", #selector(NSApplication.terminate(_:)), "q")])
        menu("Edición", [item("Deshacer", Selector(("undo:")), "z"), item("Rehacer", Selector(("redo:")), "z", [.command, .shift]), .separator(),
                         item("Cortar", #selector(NSText.cut(_:)), "x"), item("Copiar", #selector(NSText.copy(_:)), "c"),
                         item("Pegar", #selector(NSText.paste(_:)), "v"), item("Seleccionar todo", #selector(NSText.selectAll(_:)), "a")])
        menu("Ver", [item("Calendario", #selector(verMes), "1"), item("Agenda", #selector(verAgenda), "2"), .separator(),
                     item("Plegar la barra lateral", #selector(plegar), "\\"), .separator(),
                     item("Recargar", #selector(recargar), "r", [.command, .option])])
        menu("Grabar", [item("Grabar ahora", #selector(grabar), "r"), item("Ir a hoy", #selector(irHoy), "t")])
        menu("Ventana", [item("Minimizar", #selector(NSWindow.performMiniaturize(_:)), "m"), item("Cerrar", #selector(NSWindow.performClose(_:)), "w")])
        NSApp.mainMenu = barra
    }

    @objc func verMes() { js("document.querySelector('#lat-nav [data-vista=mes]')?.click()") }
    @objc func verAgenda() { js("document.querySelector('#lat-nav [data-vista=agenda]')?.click()") }
    @objc func plegar() { js("document.querySelector('[data-plegar]')?.click()") }
    @objc func grabar() { js("document.querySelector('.rodaje [data-prompter]')?.click()") }
    @objc func irHoy() { js("document.querySelector('[data-ir-hoy]')?.click()") }
    @objc func recargar() { web.reload() }

    // MARK: Pruebas: cuadros de la animación + foto de la página, sin traer nada al frente

    func capturar(en carpeta: String) {
        try? FileManager.default.createDirectory(atPath: carpeta, withIntermediateDirectories: true)
        let tamano = CGSize(width: 1360, height: 860)
        let destino = CGRect(x: 36, y: 64, width: 30, height: 30)
        for (t, vuelo) in [(0.15, 0.0), (0.35, 0.0), (0.7, 0.0), (1.1, 0.0), (1.4, 0.35), (1.6, 0.65)] {
            let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(tamano.width), pixelsHigh: Int(tamano.height), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
            NSGraphicsContext.saveGraphicsState()
            let g = NSGraphicsContext(bitmapImageRep: rep)!
            NSGraphicsContext.current = g
            let ctx = g.cgContext
            ctx.setFillColor(FONDO.cgColor); ctx.fill(CGRect(origin: .zero, size: tamano))
            ctx.translateBy(x: 0, y: tamano.height); ctx.scaleBy(x: 1, y: -1)
            Arranque.dibujar(ctx, tamano: tamano, t: t, barra: min(1, t / 1.1), vuelo: vuelo, destino: destino)
            NSGraphicsContext.restoreGraphicsState()
            try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: "\(carpeta)/arranque-\(t).png"))
        }
        arranque.removeFromSuperview(); arranque = nil
        ventana.orderBack(nil) // detrás de todo, sin activar la app
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) {
            self.web.takeSnapshot(with: nil) { img, _ in
                if let img, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff) {
                    try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: "\(carpeta)/pagina.png"))
                }
                self.web.evaluateJavaScript("[document.documentElement.className, document.title, !!window.heikaNativo, document.querySelector('#app')?.hidden]") { r, e in
                    print("página:", r ?? "", e ?? "")
                    NSApp.terminate(nil)
                }
            }
        }
    }
}

// MARK: - Arranque del programa

if let archivo = ProcessInfo.processInfo.environment["HEIKA_OIR_ARCHIVO"] {
    let listo = DispatchSemaphore(value: 0)
    Task { await Oido.probarArchivo(archivo); listo.signal() }
    while listo.wait(timeout: .now() + 0.05) == .timedOut { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
    exit(0)
}

let app = NSApplication.shared
let delegado = App()
app.delegate = delegado
app.setActivationPolicy(.regular)
app.run()
