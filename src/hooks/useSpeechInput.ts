"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechState = "idle" | "listening" | "processing" | "unsupported";

interface UseSpeechInput {
  state: SpeechState;
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  supported: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useSpeechInput(
  onResult: (text: string) => void,
  options?: { continuous?: boolean; lang?: string }
): UseSpeechInput {
  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const start = useCallback(() => {
    if (!supported) return;

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = options?.continuous ?? false;
    recognition.interimResults = true;
    recognition.lang = options?.lang ?? "en-US";

    recognitionRef.current = recognition;
    setTranscript("");
    setState("listening");

    let finalText = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript + " ";
        } else {
          interim += r[0].transcript;
        }
      }
      setTranscript((finalText + interim).trim());
    };

    recognition.onerror = () => {
      setState("idle");
    };

    recognition.onend = () => {
      setState("idle");
      const result = finalText.trim();
      if (result) {
        setTranscript(result);
        onResult(result);
      }
    };

    recognition.start();
  }, [supported, options?.continuous, options?.lang, onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.stop();
    setTranscript("");
    setState("idle");
  }, []);

  return { state, transcript, start, stop, reset, supported };
}
