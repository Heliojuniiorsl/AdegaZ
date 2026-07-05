import { Barcode, Camera, RefreshCw, X } from 'lucide-react'
import type { RefObject } from 'react'

type EanScannerModalProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  isScanning: boolean
  error: string
  isSupported: boolean
  cameraLabel: string
  canSwitchCamera?: boolean
  onClose: () => void
  onSwitchCamera?: () => void
}

export function EanScannerModal({
  videoRef,
  isScanning,
  error,
  isSupported,
  cameraLabel,
  canSwitchCamera = false,
  onClose,
  onSwitchCamera,
}: EanScannerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-2xl animate-fade-in overflow-hidden rounded-lg border border-white/10 bg-[#151217] shadow-cellar">
        <header className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ivory">
              <Barcode size={21} className="text-brass" aria-hidden="true" />
              Leitor de EAN
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              Aponte a câmera para o código de barras do produto.
            </p>
            {cameraLabel ? (
              <p className="mt-2 text-xs text-stone-500">
                Câmera principal: {cameraLabel}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {isSupported && canSwitchCamera && onSwitchCamera ? (
              <button
                type="button"
                onClick={onSwitchCamera}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-brass/35 bg-brass/10 px-3 text-sm font-semibold text-brass transition duration-200 hover:bg-brass hover:text-graphite focus:outline-none focus:ring-2 focus:ring-brass/60"
                aria-label="Trocar câmera"
                title="Trocar câmera"
              >
                <RefreshCw size={17} aria-hidden="true" />
                <span className="hidden sm:inline">Trocar câmera</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-stone-300 transition duration-200 hover:border-brass/45 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
              aria-label="Fechar leitor de EAN"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-graphite shadow-cellar">
            {isSupported ? (
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
                autoPlay
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-stone-300">
                <Camera size={48} className="text-brass" strokeWidth={1.5} aria-hidden="true" />
                <p className="max-w-xs text-sm">
                  A câmera não está disponível neste navegador ou nesta conexão.
                </p>
              </div>
            )}

            {isSupported ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-[78%] max-w-md rounded-lg border-2 border-brass/80 shadow-glow">
                  <div className="mt-16 h-px w-full bg-brass/80" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3">
            <p className="text-sm text-stone-300">
              {error ||
                (isScanning
                  ? 'Lendo EAN... mantenha o código centralizado e bem iluminado.'
                  : 'Preparando câmera...')}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
