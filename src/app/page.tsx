"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const SUGGESTED_QUERIES = [
  "¿Cuánto nitrógeno contienen 100 kg de urea al 46 %?",
  "Con 60 kg de N/ha, urea al 46 % y 12 ha, ¿cuánto producto necesito?",
  "¿Qué información necesitás para evaluar un herbicida para un cultivo?",
  "¿Qué debería tener en cuenta para planificar un muestreo de suelo?",
  "¿Cómo puedo verificar si una afirmación técnica está respaldada por una fuente?",
  "¿Podés analizar un documento técnico que te comparta?",
];

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function goToChat(question: string) {
    const q = question.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goToChat(value);
  }

  return (
    <main
      className="flex-1 flex flex-col items-center px-4 sm:px-6"
      style={{ background: "var(--surco-bg)" }}
    >
      <div className="w-full max-w-3xl mx-auto pt-12 sm:pt-20 pb-16">
        <header className="flex flex-col items-center text-center gap-5">
          <div className="flex items-center gap-2">
            <SurcoMark />
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--surco-green)" }}
            >
              Surco
            </span>
          </div>

          <span
            className="text-xs uppercase tracking-wider px-3 py-1 rounded-full border"
            style={{
              color: "var(--surco-ink-soft)",
              borderColor: "var(--surco-border)",
              background: "var(--surco-bg-alt)",
            }}
          >
            Prototipo · Agricultura extensiva de Tandil y zona
          </span>

          <h1
            className="text-3xl sm:text-4xl font-semibold leading-tight max-w-2xl"
            style={{ color: "var(--surco-ink)" }}
          >
            Información técnica agronómica, con las fuentes a la vista.
          </h1>

          <p
            className="text-base sm:text-lg max-w-xl"
            style={{ color: "var(--surco-ink-soft)" }}
          >
            Consultá en lenguaje natural. Surco distingue hechos respaldados por
            documentos, cálculos verificables e interpretaciones — y te avisa
            cuando la evidencia disponible no alcanza para concluir.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-10">
          <div
            className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border shadow-sm"
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
              className="shrink-0 rounded-xl px-5 py-3 font-medium text-white transition-colors"
              style={{ background: "var(--surco-green)" }}
            >
              Consultar
            </button>
          </div>
        </form>

        <section className="mt-10">
          <p
            className="text-sm font-medium mb-3"
            style={{ color: "var(--surco-ink-soft)" }}
          >
            Consultas sugeridas
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => goToChat(q)}
                className="text-left text-sm rounded-xl border px-4 py-3 transition-colors hover:shadow-sm"
                style={{
                  borderColor: "var(--surco-border)",
                  background: "var(--surco-card)",
                  color: "var(--surco-ink)",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        <section
          className="mt-10 rounded-xl border px-4 py-4 text-sm flex gap-3"
          style={{
            borderColor: "var(--surco-warn-border)",
            background: "var(--surco-warn-bg)",
            color: "var(--surco-ink)",
          }}
        >
          <span aria-hidden>ℹ️</span>
          <p>
            Cada respuesta muestra de dónde sale cada dato, distingue cálculos de
            recomendaciones, y reconoce explícitamente cuándo la evidencia
            disponible no es suficiente para concluir. Es un prototipo acotado:
            la biblioteca documental es pequeña y curada para esta demo.
          </p>
        </section>
      </div>
    </main>
  );
}

function SurcoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <rect width="34" height="34" rx="9" fill="var(--surco-green)" />
      <path
        d="M9 24c3-7 7-11 16-13"
        stroke="#f2ead8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 18c3-4 7-6 13-7.5"
        stroke="#9fc2a8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
