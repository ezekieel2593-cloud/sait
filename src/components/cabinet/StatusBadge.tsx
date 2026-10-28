import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";

const STYLES: Record<LeadStatus, string> = {
  new: "bg-[rgba(184,221,224,0.5)] text-[#245b66]",
  in_progress: "bg-[rgba(201,167,119,0.28)] text-[#7d5f34]",
  need_data: "bg-[rgba(220,197,217,0.5)] text-[#7c4f70]",
  awaiting_client: "bg-[rgba(220,197,217,0.35)] text-[#7c4f70]",
  ready: "bg-[rgba(140,190,160,0.3)] text-[#356b4b]",
  done: "bg-[rgba(37,61,75,0.12)] text-[var(--ocean)]",
  cancelled: "bg-[rgba(37,61,75,0.06)] text-[var(--ink-soft)]",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${STYLES[status]}`}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
