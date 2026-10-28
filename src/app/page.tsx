"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { NetworkBadge } from "@/components/NetworkBadge";
import { ModelManager } from "@/components/ModelManager";
import { ModelStatusButton } from "@/components/ModelStatusButton";
import { LocalLLMStatus } from "@/lib/local-llm";

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [showModelManager, setShowModelManager] = useState(false);
  const [modelStatus, setModelStatus] = useState<LocalLLMStatus>("unloaded");

  function goToChat(question: string) {
    const q = question.trim();
    if (!q) {
      router.push("/chat");
      return;
    }
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goToChat(value);
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "var(--surco-bg)" }}>
      <header
        className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <Link href="/" className="font-semibold text-lg" style={{ color: "var(--surco-green)" }}>
            Surco
          </Link>
          <NetworkBadge />
        </div>
        <div className="flex items-center gap-2">
          <ModelStatusButton
            onClick={() => setShowModelManager(true)}
            statusOverride={modelStatus}
          />
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <main
        className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6"
        style={{ background: "var(--surco-bg)" }}
      >
        <div className="w-full max-w-2xl mx-auto py-12">
          <header className="flex flex-col items-center text-center gap-4">
            <h1
              className="text-3xl sm:text-4xl font-semibold leading-tight"
              style={{ color: "var(--surco-ink)" }}
            >
              Respuestas agronómicas claras, con la fuente verificada.
            </h1>

            <p
              className="text-sm sm:text-base max-w-xl"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              Consultá en lenguaje natural. Si falta contexto, Surco te lo pregunta paso a paso antes de buscar en la documentación, internet o calcular resultados.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8">
            <div
              className="flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl border shadow-2xs"
              style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
            >
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    goToChat(value);
                  }
                }}
                rows={2}
                placeholder="Escribí tu consulta agronómica…"
                className="flex-1 resize-none bg-transparent px-3 py-2 outline-none text-base"
                style={{ color: "var(--surco-ink)" }}
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl px-5 py-3 font-medium text-white transition-colors cursor-pointer"
                style={{ background: "var(--surco-green)" }}
              >
                Consultar
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
