import { useCallback, useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

type UseEanScannerOptions = {
  onResult: (ean: string) => void
}

type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[]
}

type CameraConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
}

const EAN_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
]

function getCameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Permissão da câmera negada.'
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Nenhuma câmera disponível neste dispositivo.'
  }

  if (name === 'NotReadableError') {
    return 'Não foi possível acessar a câmera. Ela pode estar em uso.'
  }

  return 'Erro ao iniciar leitor de EAN.'
}

function normalizeBarcode(value: string) {
  return value.replace(/\D/g, '')
}

function isValidEanLike(value: string) {
  return /^\d{8}$/.test(value) || /^\d{12,14}$/.test(value)
}

function normalizeCameraLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getCameraScore(camera: Pick<MediaDeviceInfo, 'label'>) {
  const label = normalizeCameraLabel(camera.label)
  let score = 0

  if (/(back|rear|environment|traseira|tras|ambiente)/.test(label)) score += 100
  if (/(main|principal|wide|camera traseira)/.test(label)) score += 25
  if (/(front|user|frontal|selfie)/.test(label)) score -= 100
  if (/(ultra|ultrawide|ultra-wide|0\.5|macro)/.test(label)) score -= 70
  if (/(tele|telephoto|teleobjetiva)/.test(label)) score -= 25

  return score
}

function sortCameras(cameras: MediaDeviceInfo[]) {
  return [...cameras].sort((a, b) => getCameraScore(b) - getCameraScore(a))
}

function getActiveVideoTrack(video: HTMLVideoElement | null) {
  const stream = video?.srcObject

  if (!(stream instanceof MediaStream)) {
    return undefined
  }

  return stream.getVideoTracks()[0]
}

function getActiveDeviceId(video: HTMLVideoElement | null) {
  return getActiveVideoTrack(video)?.getSettings().deviceId
}

function getActiveCameraLabel(video: HTMLVideoElement | null) {
  return getActiveVideoTrack(video)?.label ?? ''
}

async function applyFocusTuning(video: HTMLVideoElement | null) {
  const track = getActiveVideoTrack(video)

  if (!track?.getCapabilities || !track.applyConstraints) {
    return
  }

  const capabilities = track.getCapabilities() as CameraCapabilities
  const advanced: CameraConstraintSet[] = []

  if (capabilities.focusMode?.includes('continuous')) {
    advanced.push({ focusMode: 'continuous' })
  } else if (capabilities.focusMode?.includes('single-shot')) {
    advanced.push({ focusMode: 'single-shot' })
  }

  if (advanced.length === 0) {
    return
  }

  try {
    await track.applyConstraints({ advanced } as MediaTrackConstraints)
  } catch {
    // Alguns navegadores anunciam a capacidade, mas recusam aplicar o foco manual.
  }
}

function getVideoConstraints(deviceId?: string): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  }

  if (deviceId) {
    return {
      ...base,
      deviceId: { exact: deviceId },
    }
  }

  return {
    ...base,
    facingMode: { ideal: 'environment' },
  }
}

export function useEanScanner({ onResult }: UseEanScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>()
  const [activeCameraLabel, setActiveCameraLabel] = useState('')
  const isCameraSupported =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

  const syncCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = sortCameras(devices.filter((device) => device.kind === 'videoinput'))
      const currentLabel = getActiveCameraLabel(videoRef.current)
      const currentDeviceId = getActiveDeviceId(videoRef.current)
      const bestCamera = cameras[0]

      setCameraDevices(cameras)
      setActiveCameraLabel(
        currentLabel ||
          cameras.find((camera) => camera.deviceId === currentDeviceId)?.label ||
          '',
      )

      if (
        !selectedDeviceId &&
        currentLabel &&
        bestCamera?.deviceId &&
        currentDeviceId &&
        bestCamera.deviceId !== currentDeviceId &&
        getCameraScore(bestCamera) > getCameraScore({ label: currentLabel })
      ) {
        setSelectedDeviceId(bestCamera.deviceId)
      }
    } catch {
      setCameraDevices([])
    }
  }, [selectedDeviceId])

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setIsScanning(false)
    setIsOpen(false)
  }, [])

  const startScanner = useCallback(() => {
    if (!isCameraSupported) {
      setScannerError('Leitor de EAN não disponível neste navegador.')
      setIsOpen(true)
      return
    }

    setScannerError('')
    setIsOpen(true)
  }, [isCameraSupported])

  const switchCamera = useCallback(() => {
    if (cameraDevices.length < 2) {
      return
    }

    const currentDeviceId = getActiveDeviceId(videoRef.current) ?? selectedDeviceId
    const currentIndex = currentDeviceId
      ? cameraDevices.findIndex((camera) => camera.deviceId === currentDeviceId)
      : -1
    const nextCamera = cameraDevices[(currentIndex + 1) % cameraDevices.length]

    if (!nextCamera?.deviceId) {
      return
    }

    setScannerError('')
    setIsScanning(false)
    setSelectedDeviceId(nextCamera.deviceId)
    setActiveCameraLabel(nextCamera.label)
  }, [cameraDevices, selectedDeviceId])

  useEffect(() => {
    if (!isOpen || !isCameraSupported || !videoRef.current) {
      return undefined
    }

    let cancelled = false
    const hints = new Map<DecodeHintType, unknown>()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, EAN_FORMATS)
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 160,
      delayBetweenScanSuccess: 500,
      tryPlayVideoTimeout: 9000,
    })

    async function start() {
      try {
        setIsScanning(true)
        controlsRef.current = await reader.decodeFromConstraints(
          {
            audio: false,
            video: getVideoConstraints(selectedDeviceId),
          },
          videoRef.current ?? undefined,
          (result, _error, controls) => {
            if (cancelled || !result) {
              return
            }

            const barcode = normalizeBarcode(result.getText())

            if (!isValidEanLike(barcode)) {
              setScannerError('Código lido não parece ser um EAN válido.')
              return
            }

            controls.stop()
            controlsRef.current = null
            setIsScanning(false)
            setIsOpen(false)
            setScannerError('')
            onResult(barcode)
          },
        )
        await applyFocusTuning(videoRef.current)
        await syncCameraDevices()
      } catch (error) {
        if (!cancelled) {
          setScannerError(getCameraErrorMessage(error))
          setIsScanning(false)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      setIsScanning(false)
    }
  }, [isCameraSupported, isOpen, onResult, selectedDeviceId, syncCameraDevices])

  return {
    videoRef,
    isScannerOpen: isOpen,
    isScanning,
    scannerError,
    isCameraSupported,
    cameraLabel: activeCameraLabel,
    cameraCount: cameraDevices.length,
    canSwitchCamera: cameraDevices.length > 1,
    startScanner,
    stopScanner,
    switchCamera,
  }
}
