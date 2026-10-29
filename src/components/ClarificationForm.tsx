"use client";

import { FormEvent, useState } from "react";
import { ClarificationForm as ClarificationFormData } from "@/lib/types";
import { IconCheck, IconSend } from "./Icons";

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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-3.5 sm:p-4 flex flex-col gap-3 transition-all"
      style={{
        borderColor: disabled ? "var(--surco-border-light)" : "var(--surco-border)",
        background: disabled ? "var(--surco-bg)" : "var(--surco-bg-alt)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "var(--surco-ink)" }}>
          {disabled ? "Contexto completado" : "Datos necesarios para continuar"}
        </span>
        {disabled && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
          >
            <IconCheck className="w-3 h-3" /> Enviado
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {form.fields.map((field) => (
          <label key={field.id} className="flex flex-col gap-1 text-xs">
            <span className="font-medium" style={{ color: "var(--surco-ink-soft)" }}>
              {field.label}
              {field.required && !disabled && <span className="text-red-500 font-bold ml-0.5">*</span>}
            </span>
            {field.type === "select" ? (
              <select
                value={values[field.id] ?? ""}
                onChange={(e) => setField(field.id, e.target.value)}
                disabled={disabled}
                className="rounded-lg border px-3 py-2 bg-white text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
              >
                <option value="">Seleccionar…</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === "date" ? "date" : "text"}
                value={values[field.id] ?? ""}
                onChange={(e) => setField(field.id, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                className="rounded-lg border px-3 py-2 bg-white text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
              />
            )}
          </label>
        ))}
      </div>

      {!disabled && (
        <button
          type="submit"
          disabled={missingRequired}
          className="self-start inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium text-white disabled:opacity-50 transition-all cursor-pointer hover:opacity-90 shadow-2xs"
          style={{ background: "var(--surco-green)" }}
        >
          <span>{form.submitLabel ?? "Completar y consultar"}</span>
          <IconSend className="w-3 h-3" />
        </button>
      )}
    </form>
  );
}
