import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "react-use";
import Pagination from "rc-pagination";
import { AlertTriangle, Mail, Megaphone, PenLine, Search } from "lucide-react";

import { Btn, Card, EmptyState, Modal, PageHeader, Pill, Skeleton, Tabs, formatDate, formatNumber } from "@/common/ui/kit";
import { appPaths } from "@/utils/app-paths";
import { EmailLog, useGetEmailHistoryQuery, useGetEmailStatsQuery } from "./email-api";

/**
 * Direct email: every email staff have sent (Outreach campaigns, nudges and
 * hand-picked emails alike), and the way in to write a new one. Opening a row
 * shows the email exactly as it was sent.
 */

type StatusFilter = "all" | EmailLog["status"];
const LIMIT = 20;

const STATUS: Record<EmailLog["status"], { label: string; tone: "green" | "gray" | "red" }> = {
  sent: { label: "Sent", tone: "green" },
  pending: { label: "Waiting to send", tone: "gray" },
  failed: { label: "Failed", tone: "red" },
};

const KIND: Record<string, string> = {
  campaign: "Outreach",
  individual: "Direct (old)",
  bulk: "Direct (old)",
  all_users: "Everyone (old)",
};

export default function EmailLandingPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<EmailLog | null>(null);
  useDebounce(() => (setSearch(term.trim()), setPage(1)), 350, [term]);

  const { data: stats, isLoading: statsLoading } = useGetEmailStatsQuery();
  const { data, isLoading, isFetching } = useGetEmailHistoryQuery({
    page,
    limit: LIMIT,
    status: status === "all" ? undefined : status,
    search: search || undefined,
  });
  const totals = stats?.totals;
  const rows = data?.data ?? [];
  const total = Number(data?.pagination.total ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="Direct email"
        description="Every email staff have sent, and where to write a new one to people you pick. For a whole group, use Outreach."
        actions={
          <>
            <Btn variant="secondary" icon={<Megaphone size={15} />} onClick={() => navigate(appPaths.outreach)}>Outreach</Btn>
            <Btn icon={<PenLine size={15} />} onClick={() => navigate(appPaths.emailCompose)}>Write an email</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sent" value={totals?.sent} loading={statsLoading} />
        <Stat label="Delivery rate" value={totals ? `${totals.successRate}%` : undefined} loading={statsLoading} hint={totals ? `of ${formatNumber(totals.total)} emails` : undefined} />
        <Stat label="Waiting to send" value={totals?.pending} loading={statsLoading} hint="Paced to stay within the daily allowance" />
        <Stat label="Failed" value={totals?.failed} loading={statsLoading} tone={totals?.failed ? "danger" : undefined} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-rule px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Tabs<StatusFilter>
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            items={[
              { value: "all", label: "All" },
              { value: "sent", label: "Sent", count: totals?.sent },
              { value: "pending", label: "Waiting", count: totals?.pending },
              { value: "failed", label: "Failed", count: totals?.failed },
            ]}
          />
          <div className="relative md:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search recipient or subject"
              aria-label="Search emails"
              className="h-9 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-sm text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-2.5">To</th>
                <th className="px-3 py-2.5">Subject</th>
                <th className="px-3 py-2.5">Kind</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">When</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-rule ${isFetching && !isLoading ? "opacity-60" : ""}`}>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-3"><Skeleton className="h-6" /></td>
                  </tr>
                ))
              ) : !rows.length ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={<Mail size={22} />} title={search || status !== "all" ? "No emails match" : "No emails yet"}>
                      {search || status !== "all" ? "Try another search or filter." : "Emails staff send appear here."}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((log) => (
                  <tr key={log.id} onClick={() => setOpen(log)} className="cursor-pointer hover:bg-paper">
                    <td className="max-w-[220px] px-5 py-3">
                      <p className="truncate font-semibold text-ink">{log.recipientName || log.recipientEmail || "—"}</p>
                      {log.recipientName && <p className="truncate text-[12px] text-ink-soft">{log.recipientEmail}</p>}
                    </td>
                    <td className="max-w-[320px] px-3 py-3"><p className="truncate text-ink">{log.subject}</p></td>
                    <td className="px-3 py-3 text-[12.5px] text-ink-soft">{KIND[log.emailType] ?? log.emailType}</td>
                    <td className="px-3 py-3"><Pill tone={STATUS[log.status]?.tone ?? "gray"} dot>{STATUS[log.status]?.label ?? log.status}</Pill></td>
                    <td className="tnum whitespace-nowrap px-5 py-3 text-right text-[12.5px] text-ink-soft">{formatDate(log.sentAt ?? log.createdAt, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > LIMIT && (
          <div className="flex justify-end border-t border-rule px-5 py-3">
            <Pagination current={page} total={total} pageSize={LIMIT} onChange={setPage} showSizeChanger={false} />
          </div>
        )}
      </Card>

      {open && <EmailDetail log={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Stat({ label, value, hint, loading, tone }: { label: string; value?: number | string; hint?: string; loading?: boolean; tone?: "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-[12.5px] font-medium text-ink-soft">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className={`tnum mt-1 text-[26px] font-bold tracking-[-0.02em] ${tone === "danger" ? "text-danger" : "text-ink"}`}>{typeof value === "number" ? formatNumber(value) : value ?? "—"}</p>
      )}
      {hint && <p className="mt-0.5 text-[12px] text-ink-faint">{hint}</p>}
    </Card>
  );
}

/** One email as it was sent: who, when, what happened, and the email itself. */
function EmailDetail({ log, onClose }: { log: EmailLog; onClose: () => void }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(log.body);
  return (
    <Modal open onClose={onClose} width="max-w-3xl" title={log.subject} subtitle={`To ${log.recipientName ? `${log.recipientName} <${log.recipientEmail}>` : log.recipientEmail ?? "—"}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
        <Pill tone={STATUS[log.status]?.tone ?? "gray"} dot>{STATUS[log.status]?.label ?? log.status}</Pill>
        <span>{KIND[log.emailType] ?? log.emailType}</span>
        <span>·</span>
        <span>{log.sentAt ? `Sent ${formatDate(log.sentAt, true)}` : `Queued ${formatDate(log.createdAt, true)}`}</span>
      </div>
      {log.status === "failed" && log.errorMessage && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger-deep">
          <AlertTriangle size={15} className="mt-px shrink-0" /> {log.errorMessage}
        </p>
      )}
      <div className="rounded-xl bg-paper p-3">
        {isHtml ? (
          <iframe title="The email as sent" srcDoc={`<body style="margin:16px;background:#fff">${log.body}</body>`} sandbox="" className="h-[520px] w-full rounded-lg bg-white ring-1 ring-rule" />
        ) : (
          <pre className="whitespace-pre-wrap rounded-lg bg-white p-4 font-sans text-[13.5px] leading-relaxed text-ink ring-1 ring-rule">{log.body}</pre>
        )}
      </div>
    </Modal>
  );
}
