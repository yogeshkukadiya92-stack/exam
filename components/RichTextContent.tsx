import { normalizeRichTextContent } from "@/lib/rich-text";

export default function RichTextContent({
  content,
  className = "",
  clamp = false,
}: {
  content: string;
  className?: string;
  clamp?: boolean;
}) {
  return (
    <div
      className={`${clamp ? "line-clamp-2" : ""} rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: normalizeRichTextContent(content) }}
    />
  );
}
