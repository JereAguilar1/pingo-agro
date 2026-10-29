"use client";

import { FormEvent, useState } from "react";
import { ClarificationForm as ClarificationFormData } from "@/lib/types";
import { IconCheck, IconSend, IconSparkles } from "./Icons";

interface Props {
  form: ClarificationFormData;
  disabled?: boolean;
  onSubmit: (data: Record<string, string>) => void;
}

export function ClarificationForm({ form, disabled, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  function setField(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    onSubmit(values);
  }

  const missingRequired = form.fields.some((f) => f.required && !values[f.id]?.trim());
  const completedCount = form.fields.filter((f) => Boolean(values[f.id]?.trim())).length;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-4 sm:p-6 flex flex-col gap-4 transition-all shadow-xs"
      style={{
        borderColor: disabled ? "var(--surco-border-light)" : "var(--surco-border)",
        background: disabled ? "var(--surco-bg)" : "#ffffff",
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
          >
            <IconSparkles className="w-4 h-4" />
          </span>
          <div>
            <span className="text-sm sm:text-base font-bold block" style={{ color: "var(--surco-ink)" }}>
              {disabled ? "Datos del lote confirmados" : "Completá estos datos para el cálculo preciso"}
            </span>
            {!disabled && (
              <span className="text-xs" style={{ color: "var(--surco-ink-muted)" }}>
                {completedCount} de {form.fields.length} campos completados
              </span>
            )}
          </div>
        </div>

        {disabled && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
          >
            <IconCheck className="w-3.5 h-3.5" /> Enviado
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {form.fields.map((field) => {
          const val = values[field.id] ?? "";
          const usePills =
            field.type === "select" &&
            field.options &&
            field.options.length > 0 &&
            field.options.length <= 6;

          return (
            <div
              key={field.id}
              className={`flex flex-col gap-2 text-sm rounded-xl border p-3.5 ${
                usePills ? "sm:col-span-2" : ""
              }`}
              style={{
                background: "var(--surco-bg)",
                borderColor: val ? "var(--surco-green)" : "var(--surco-border-light)",
              }}
            >
              <label className="font-semibold text-xs sm:text-sm flex items-center justify-between" style={{ color: "var(--surco-ink)" }}>
                <span>
                  {field.label}
                  {field.required && !disabled && <span className="text-red-500 font-bold ml-1">*</span>}
                </span>
                {val && <IconCheck className="w-3.5 h-3.5 text-emerald-700" />}
              </label>

              {usePills ? (
                <div className="flex flex-wrap gap-2">
                  {field.options!.map((opt) => {
                    const active = val === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={disabled}
                        onClick={() => setField(field.id, opt)}
                        className="px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer disabled:opacity-60"
                        style={{
                          background: active ? "var(--surco-green)" : "#ffffff",
                          borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          color: active ? "#ffffff" : "var(--surco-ink)",
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : field.type === "select" ? (
                <select
                  value={val}
                  onChange={(e) => setField(field.id, e.target.value)}
                  disabled={disabled}
                  className="rounded-xl border px-3.5 py-2.5 bg-white text-sm font-medium outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                >
                  <option value="">Seleccionar opción…</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "date" ? "date" : "text"}
                  value={val}
                  onChange={(e) => setField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  className="rounded-xl border px-3.5 py-2.5 bg-white text-sm font-medium outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {!disabled && (
        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            disabled={missingRequired}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-45 transition-all cursor-pointer hover:opacity-95 shadow-xs"
            style={{ background: "var(--surco-green)" }}
          >
            <span>{form.submitLabel ?? "Confirmar datos y calcular"}</span>
            <IconSend className="w-4 h-4" />
          </button>
        </div>
      )}
    </form>
  );
}
