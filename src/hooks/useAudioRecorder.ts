"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingTime: number;
  liveTranscript: string;
  error: string | null;
  startRecording: () => Promise<boolean>;
  stopAndSend: () => Promise<string | null>;
  cancelRecording: () => void;
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionRef = useRef<any>(null);
  const capturedTextRef = useRef("");

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLiveTranscript("");
    capturedTextRef.current = "";
    audioChunksRef.current = [];

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no soporta grabación de audio.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Iniciar reconocimiento de voz nativo en paralelo (Web Speech API)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = "es-AR";
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            let full = "";
            for (let i = 0; i < event.results.length; i++) {
              full += event.results[i][0].transcript;
            }
            if (full.trim()) {
              capturedTextRef.current = full.trim();
              setLiveTranscript(full.trim());
            }
          };

          recognition.onerror = () => {
            // Continúa con MediaRecorder como respaldo
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          // El navegador puede bloquearlo, continuar con MediaRecorder
        }
      }

      // Configurar MediaRecorder
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(150);
        mediaRecorderRef.current = recorder;
      }

      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      setError("Permiso de micrófono denegado o no disponible.");
      cleanup();
      return false;
    }
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    cleanup();
    setLiveTranscript("");
    capturedTextRef.current = "";
    audioChunksRef.current = [];
  }, [cleanup]);

  const stopAndSend = useCallback(async (): Promise<string | null> => {
    setIsTranscribing(true);

    // Detener timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Detener reconocimiento de voz
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    }

    // Obtener texto transcrito si ya está disponible en vivo
    const localTranscript = capturedTextRef.current.trim() || liveTranscript.trim();

    // Detener grabador y capturar audio final
    const recorder = mediaRecorderRef.current;
    let audioBlob: Blob | null = null;

    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
    }

    if (audioChunksRef.current.length > 0) {
      const mime = recorder?.mimeType || "audio/webm";
      audioBlob = new Blob(audioChunksRef.current, { type: mime });
    }

    // Detener tracks del stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);

    try {
      // 1. Si la API de voz nativa del dispositivo ya capturó el texto, usarlo directamente
      if (localTranscript) {
        setIsTranscribing(false);
        setLiveTranscript("");
        capturedTextRef.current = "";
        return localTranscript;
      }

      // 2. Si no hubo transcripción nativa pero hay audio grabado, consultar /api/transcribe
      if (audioBlob && audioBlob.size > 1000) {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (typeof data.text === "string" && data.text.trim()) {
            setIsTranscribing(false);
            setLiveTranscript("");
            capturedTextRef.current = "";
            return data.text.trim();
          }
        }
      }

      setError("No se reconoció voz en el audio. Probá hablar más cerca del micrófono.");
      return null;
    } catch (err) {
      console.error("Error transcribiendo audio:", err);
      setError("No se pudo transcribir el audio.");
      return null;
    } finally {
      setIsTranscribing(false);
      setLiveTranscript("");
      capturedTextRef.current = "";
    }
  }, [liveTranscript]);

  return {
    isRecording,
    isTranscribing,
    recordingTime,
    liveTranscript,
    error,
    startRecording,
    stopAndSend,
    cancelRecording,
  };
}
