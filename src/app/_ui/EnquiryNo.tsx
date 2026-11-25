import Link from "next/link";
import { Hash, ReceiptText, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Enquiry number shown as a violet tag (tinted background + violet text + icon), linking to the enquiry.
 * One colour for every enquiry number so they're easy to spot in lists.
 */
export function EnquiryNo({ id, no, className }: { id: number | string; no: string; className?: string }) {
  return (
    <Link
      href={`/enquiries/${id}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-tag-enquiry-border bg-tag-enquiry-bg px-2 py-0.5 text-sm font-semibold text-tag-enquiry-fg transition-colors hover:border-tag-enquiry-border-hover hover:bg-tag-enquiry-bg-hover focus-visible:ring-[3px] focus-visible:ring-tag-enquiry-border focus-visible:outline-none",
        className,
      )}
    >
      <Hash className="size-3.5 shrink-0" strokeWidth={2.5} />
      <span className="truncate">{no}</span>
    </Link>
  );
}

/** Work type as an orange tag (tag-worktype tokens), same shape as the enquiry number. */
export function WorkTypeTag({ name, className }: { name: string; className?: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-tag-worktype-border bg-tag-worktype-bg px-2 py-0.5 text-xs font-semibold text-tag-worktype-fg",
        className,
      )}
    >
      <Wrench className="size-3 shrink-0" strokeWidth={2.5} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Zoho quotation number as a slate tag (tag-quote tokens, same shape as the other tags). */
export function QuoteNoTag({ quoteNo, className }: { quoteNo?: string | null; className?: string }) {
  if (!quoteNo) return null;
  return (
    <span
      title={`Zoho quote ${quoteNo}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-tag-quote-border bg-tag-quote-bg px-2 py-0.5 text-xs font-semibold text-tag-quote-fg",
        className,
      )}
    >
      <ReceiptText className="size-3 shrink-0" strokeWidth={2.5} />
      <span className="truncate">{quoteNo}</span>
    </span>
  );
}

/** Several work types for list rows: the first `max` as tags, the rest as "+N" (full list on hover). */
export function WorkTypeTags({ items, max = 2, className }: { items: { id: number; name: string }[]; max?: number; className?: string }) {
  if (!items?.length) return <span className="text-xs text-muted-foreground">—</span>;
  const rest = items.length - max;
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-1", className)} title={items.map((i) => i.name).join(", ")}>
      {items.slice(0, max).map((i) => (
        <WorkTypeTag key={i.id} name={i.name} />
      ))}
      {rest > 0 && (
        <span className="rounded-md border border-tag-worktype-border px-1.5 py-0.5 text-xs font-semibold text-tag-worktype-fg tabular-nums">+{rest}</span>
      )}
    </span>
  );
}
