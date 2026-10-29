"use client";

import { ChatMessage } from "@/lib/types";
import { SourceCard } from "./SourceCard";
import { ClarificationForm } from "./ClarificationForm";

interface Props {
  message: ChatMessage;
  onSubmitForm?: (messageId: string, data: Record<string, string>) => void;
}

export function MessageBubble({ message, onSubmitForm }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end my-1">
        <div
          className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-white text-[14px] leading-relaxed"
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
        className="w-full max-w-[96%] sm:max-w-[88%] rounded-2xl rounded-tl-sm border px-4 py-3.5 flex flex-col gap-3 bg-white"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        <p
          className="whitespace-pre-wrap leading-relaxed text-[14px]"
          style={{ color: "var(--surco-ink)" }}
        >
          {message.content}
        </p>

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
            className="flex flex-col gap-1.5 pt-2.5 border-t"
            style={{ borderColor: "var(--surco-border-light)" }}
          >
            <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
              <span>Fuentes verificadas ({r.sources.length})</span>
            </div>
            <div className="flex flex-col gap-1">
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
