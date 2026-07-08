"use client";

import { useRef, useState } from "react";
import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import { normalizeRichTextContent, richTextToPlainText } from "@/lib/rich-text";

const tools = [
  { command: "bold", label: "Bold", icon: Bold },
  { command: "italic", label: "Italic", icon: Italic },
  { command: "underline", label: "Underline", icon: Underline },
  { command: "insertUnorderedList", label: "Bullet list", icon: List },
  { command: "insertOrderedList", label: "Number list", icon: ListOrdered },
];

export default function RichTextEditor({
  name,
  initialContent = "",
  required = false,
  placeholder = "",
}: {
  name: string;
  initialContent?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(() => normalizeRichTextContent(initialContent));
  const [plainText, setPlainText] = useState(() => richTextToPlainText(initialContent));

  const sync = () => {
    const next = editorRef.current?.innerHTML ?? "";
    setHtml(normalizeRichTextContent(next));
    setPlainText(richTextToPlainText(next));
  };

  const run = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command);
    sync();
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tools.map((tool) => (
          <button
            key={tool.command}
            type="button"
            onClick={() => run(tool.command)}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
            title={tool.label}
            aria-label={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        data-placeholder={placeholder}
        className="rich-editor input min-h-40 overflow-auto whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <input type="hidden" name={name} value={html} />
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none h-0 w-0 opacity-0"
          value={plainText}
          onChange={() => undefined}
          required
        />
      )}
    </div>
  );
}
