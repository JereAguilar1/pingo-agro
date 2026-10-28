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
      <div className="flex justify-end">
        <div
          className="max-w-[85%] sm:max-w-[72%] rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm sm:text-[15px] leading-relaxed"
          style={{ background: "var(--surco-green)" }}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const r = message.response;

  return (
    <div className="flex justify-start">
      <div
        className="w-full max-w-[92%] sm:max-w-[82%] rounded-2xl rounded-tl-sm border px-5 py-4 flex flex-col gap-3.5 shadow-2xs"
        style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
      >
        <p
          className="whitespace-pre-wrap leading-relaxed text-sm sm:text-[15px]"
          style={{ color: "var(--surco-ink)" }}
        >
          {message.content}
        </p>

        {r?.clarificationForm && (
          <ClarificationForm
            form={r.clarificationForm}
            disabled={message.formAnswered || !onSubmitForm}
            onSubmit={(data) => onSubmitForm?.(message.id, data)}
          />
        )}

        {r && r.sources.length > 0 && (
          <div
            className="flex flex-col gap-1.5 pt-2.5 border-t"
            style={{ borderColor: "var(--surco-border)" }}
          >
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              Fuentes ({r.sources.length})
            </span>
            {r.sources.map((s) => (
              <SourceCard key={s.sourceCode + s.title} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
