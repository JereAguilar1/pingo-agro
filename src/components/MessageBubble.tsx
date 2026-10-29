"use client";

import { ChatMessage } from "@/lib/types";
import { SourceCard } from "./SourceCard";
import { ClarificationForm } from "./ClarificationForm";
import { IconSparkles } from "./Icons";

interface Props {
  message: ChatMessage;
  onSubmitForm?: (messageId: string, data: Record<string, string>) => void;
}

export function MessageBubble({ message, onSubmitForm }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end my-1">
        <div
          className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-3 text-white text-[14px] sm:text-[15px] leading-relaxed shadow-xs"
          style={{ background: "var(--surco-green)" }}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const r = message.response;

  return (
    <div className="flex justify-start my-1.5">
      <div
        className="w-full max-w-[96%] sm:max-w-[85%] rounded-2xl rounded-tl-sm border px-4 sm:px-5 py-4 flex flex-col gap-3 shadow-xs transition-shadow"
        style={{
          background: "var(--surco-card)",
          borderColor: "var(--surco-border-light)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
            title="Asistente Agronómico Surco"
          >
            <IconSparkles className="w-3 h-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="whitespace-pre-wrap leading-relaxed text-[14px] sm:text-[15px]"
              style={{ color: "var(--surco-ink)" }}
            >
              {message.content}
            </p>
          </div>
        </div>

        {r?.clarificationForm && (
          <div className="pt-1">
            <ClarificationForm
              form={r.clarificationForm}
              disabled={message.formAnswered || !onSubmitForm}
              onSubmit={(data) => onSubmitForm?.(message.id, data)}
            />
          </div>
        )}

        {r && r.sources.length > 0 && (
          <div
            className="flex flex-col gap-1.5 pt-3 border-t mt-1"
            style={{ borderColor: "var(--surco-border-light)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--surco-ink-muted)" }}
              >
                Fuentes oficiales verificadas ({r.sources.length})
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {r.sources.map((s) => (
                <SourceCard key={s.sourceCode + s.title} source={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
