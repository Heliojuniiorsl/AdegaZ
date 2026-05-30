import { useCallback, useEffect, useRef, useState } from 'react'

type VoiceRecognitionAlternative = {
  transcript: string
}

type VoiceRecognitionResult = {
  readonly length: number
  [index: number]: VoiceRecognitionAlternative
}

type VoiceRecognitionResultList = {
  readonly length: number
  [index: number]: VoiceRecognitionResult
}

type VoiceRecognitionResultEvent = {
  results: VoiceRecognitionResultList
}

type VoiceRecognitionErrorEvent = {
  error: string
}

type VoiceRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: VoiceRecognitionResultEvent) => void) | null
  onerror: ((event: VoiceRecognitionErrorEvent) => void) | null
  start: () => void
  abort: () => void
}

type VoiceRecognitionConstructor = new () => VoiceRecognition

declare global {
  interface Window {
    SpeechRecognition?: VoiceRecognitionConstructor
    webkitSpeechRecognition?: VoiceRecognitionConstructor
  }
}

type UseVoiceSearchOptions = {
  onResult: (transcript: string) => void
}

function getRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

function getVoiceErrorMessage(error: string) {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'Permissão do microfone negada.'
  }

  if (error === 'no-speech') {
    return 'Não consegui entender. Tente falar novamente.'
  }

  if (error === 'aborted') {
    return 'Reconhecimento cancelado.'
  }

  return 'Erro ao iniciar reconhecimento de voz.'
}

export function useVoiceSearch({ onResult }: UseVoiceSearchOptions) {
  const recognitionRef = useRef<VoiceRecognition | null>(null)
  const manualAbortRef = useRef(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [isVoiceSupported] = useState(() => Boolean(getRecognitionConstructor()))
  const clearVoiceError = useCallback(() => {
    setVoiceError('')
  }, [])

  const startListening = useCallback(() => {
    const Recognition = getRecognitionConstructor()

    if (!Recognition) {
      setVoiceError('Pesquisa por voz não disponível neste navegador.')
      setIsListening(false)
      return
    }

    if (recognitionRef.current) {
      manualAbortRef.current = true
      recognitionRef.current.abort()
      setIsListening(false)
      return
    }

    const recognition = new Recognition()
    recognitionRef.current = recognition
    manualAbortRef.current = false
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceError('')
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()

      if (transcript) {
        onResult(transcript)
        setVoiceError('')
        return
      }

      setVoiceError('Não consegui entender. Tente falar novamente.')
    }

    recognition.onerror = (event) => {
      if (manualAbortRef.current && event.error === 'aborted') {
        setVoiceError('')
      } else {
        setVoiceError(getVoiceErrorMessage(event.error))
      }

      setIsListening(false)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      manualAbortRef.current = false
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setIsListening(false)
      setVoiceError('Erro ao iniciar reconhecimento de voz.')
    }
  }, [onResult])

  useEffect(() => {
    return () => {
      manualAbortRef.current = true
      recognitionRef.current?.abort()
    }
  }, [])

  return {
    isListening,
    voiceError,
    isVoiceSupported,
    startListening,
    clearVoiceError,
  }
}
