"use client";

import { FormEvent, useState } from "react";
import { ClarificationForm as ClarificationFormData } from "@/lib/types";

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
      className="rounded-xl border px-4 py-4 flex flex-col gap-3"
      style={{ borderColor: "var(--surco-border)", background: "var(--surco-bg-alt)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--surco-ink-soft)" }}>
        Completá estos datos para seguir
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {form.fields.map((field) => (
          <label key={field.id} className="flex flex-col gap-1 text-sm">
            <span style={{ color: "var(--surco-ink)" }}>
              {field.label}
              {field.required && <span style={{ color: "#8a2e2e" }}> *</span>}
            </span>
            {field.type === "select" ? (
              <select
                value={values[field.id] ?? ""}
                onChange={(e) => setField(field.id, e.target.value)}
                disabled={disabled}
                className="rounded-lg border px-3 py-2 bg-white text-sm outline-none disabled:opacity-60"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
              >
                <option value="">Seleccioná…</option>
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
                className="rounded-lg border px-3 py-2 bg-white text-sm outline-none disabled:opacity-60"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
              />
            )}
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={disabled || missingRequired}
        className="self-start rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
        style={{ background: "var(--surco-green)" }}
      >
        {disabled ? "Enviado" : form.submitLabel ?? "Enviar"}
      </button>
    </form>
  );
}
