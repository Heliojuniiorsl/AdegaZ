import { useMemo, useState } from 'react'
import { ImageOff, Wine } from 'lucide-react'

type ImageGalleryProps = {
  images: string[]
  alt: string
}

function BottlePlaceholder() {
  return (
    <div className="flex h-full min-h-80 w-full flex-col items-center justify-center gap-4 rounded-lg border border-brass/20 bg-gradient-to-b from-white/[0.08] to-white/[0.03] text-brass">
      <Wine size={64} strokeWidth={1.4} aria-hidden="true" />
      <span className="text-sm font-medium text-stone-300">Imagem indisponível</span>
    </div>
  )
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const galleryImages = useMemo(() => [...new Set(images.filter(Boolean))], [images])
  const [chosenImage, setChosenImage] = useState<string | null>(null)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const [brokenThumbnails, setBrokenThumbnails] = useState<Set<string>>(new Set())

  const selectedImage =
    chosenImage && galleryImages.includes(chosenImage) ? chosenImage : (galleryImages[0] ?? '')
  const hasError = failedImage === selectedImage
  const hasImage = selectedImage && !hasError

  return (
    <section className="animate-fade-in">
      <div className="aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-white/[0.05] p-5 shadow-cellar">
        {hasImage ? (
          <img
            src={selectedImage}
            alt={alt}
            className="h-full w-full object-contain drop-shadow-2xl"
            onError={() => setFailedImage(selectedImage)}
          />
        ) : (
          <BottlePlaceholder />
        )}
      </div>

      {galleryImages.length > 1 ? (
        <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-6">
          {galleryImages.slice(0, 12).map((image) => {
            const selected = image === selectedImage && !hasError
            const thumbnailFailed = brokenThumbnails.has(image)

            return (
              <button
                type="button"
                key={image}
                onClick={() => {
                  setChosenImage(image)
                  setFailedImage(null)
                }}
                className={`aspect-square overflow-hidden rounded-md border bg-white/[0.06] p-2 transition duration-200 ${
                  selected
                    ? 'border-brass shadow-glow'
                    : 'border-white/10 hover:border-brass/50'
                }`}
                aria-label="Selecionar imagem do vinho"
              >
                {thumbnailFailed ? (
                  <span className="flex h-full w-full items-center justify-center text-brass">
                    <Wine size={22} strokeWidth={1.4} aria-hidden="true" />
                  </span>
                ) : (
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={() => {
                      setBrokenThumbnails((current) => {
                        const next = new Set(current)
                        next.add(image)
                        return next
                      })
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      ) : null}

      {!hasImage && galleryImages.length > 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-stone-400">
          <ImageOff size={16} aria-hidden="true" />
          Não foi possível carregar esta imagem.
        </p>
      ) : null}
    </section>
  )
}
