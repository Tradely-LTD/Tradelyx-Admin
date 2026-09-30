import { useState } from "react";
import Pagination from "rc-pagination";
import { Megaphone, RotateCw } from "lucide-react";
import { toast } from "react-toastify";

import { useGetCampaignsQuery, useGetSegmentsQuery, useRetryCampaignMutation } from "../outreach-api";
import { Btn, Card, EmptyState, Pill, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";

// Subjects are stored as written; show the placeholders the way staff read them
const readable = (subject: string) =>
  subject.replace(/\{\{\s*firstName\s*\}\}/g, "[first name]").replace(/\{\{\s*companyName\s*\}\}/g, "[company]");

/** Every campaign and how far it has got. Refreshes itself while one is still going out. */
export default function Campaigns() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetCampaignsQuery({ page, limit: 10 });
  const sending = data?.data.some((c) => c.status === "sending");
  useGetCampaignsQuery({ page, limit: 10 }, { pollingInterval: sending ? 5000 : 0, skip: !sending });
  const { data: segments } = useGetSegmentsQuery();
  const [retry, { isLoading: retrying, originalArgs: retryingId }] = useRetryCampaignMutation();
  const retryFailed = async (id: string) => {
    try {
      const { data } = await retry(id).unwrap();
      toast.success(
        data.requeued
          ? `${formatNumber(data.requeued)} emails are back in the queue and go out as the allowance allows.`
          : "None of the failures were quota refusals, so there's nothing to retry.",
        { position: "top-right" }
      );
    } catch (err: any) {
      toast.error(err?.data?.error || "Could not retry", { position: "top-right" });
    }
  };
  const audience = (key: string) => (key === "one_user" ? "One person" : segments?.find((s) => s.key === key)?.label ?? key);

  if (isLoading) return <Card className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>;
  if (!data?.data.length)
    return (
      <Card>
        <EmptyState icon={<Megaphone size={20} />} title="No campaigns yet">
          Pick a template on the Compose tab. Everything you send shows up here with its progress.
        </EmptyState>
      </Card>
    );

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              <th className="px-5 py-3">Email</th>
              <th className="px-3 py-3">Audience</th>
              <th className="px-3 py-3">Progress</th>
              <th className="px-3 py-3">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {data.data.map((c) => {
              const total = c.totalRecipients || c.sent + c.failed + c.pending || 1;
              return (
                <tr key={c.id} className="align-top">
                  <td className="max-w-[360px] px-5 py-3.5">
                    <p className="truncate font-semibold text-ink" title={readable(c.subject)}>{readable(c.subject)}</p>
                    <p className="text-[12px] text-ink-faint">by {c.senderName || "staff"}</p>
                  </td>
                  <td className="px-3 py-3.5 text-ink-soft">{audience(c.segment)}</td>
                  <td className="w-[260px] px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      {c.status === "sending" ? <Pill tone="blue" dot>Sending</Pill> : c.failed ? <Pill tone="orange" dot>Done with errors</Pill> : <Pill tone="green" dot>Delivered</Pill>}
                      <span className="tnum text-[12px] text-ink-soft">
                        {formatNumber(c.sent)}/{formatNumber(total)}
                      </span>
                    </div>
                    <div className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-paper-deep" aria-hidden>
                      <div className="bg-brand-700" style={{ width: `${(c.sent / total) * 100}%` }} />
                      {c.failed > 0 && <div className="bg-danger" style={{ width: `${(c.failed / total) * 100}%` }} />}
                    </div>
                    {c.failed > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="tnum text-[11.5px] text-danger-deep">{formatNumber(c.failed)} failed or skipped</p>
                        {c.status === "done" && (
                          <Btn
                            size="sm"
                            variant="ghost"
                            icon={<RotateCw size={12} />}
                            loading={retrying && retryingId === c.id}
                            onClick={() => retryFailed(c.id)}
                            className="h-6 px-2 text-[11.5px]"
                            title="Re-send the emails refused because the sending quota was used up"
                          >
                            Retry quota failures
                          </Btn>
                        )}
                      </div>
                    )}
                    {c.status === "sending" && c.pending > 0 && c.sent + c.failed > 0 && (
                      <p className="mt-1 text-[11.5px] text-ink-faint">Paused emails resume automatically when the allowance allows.</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-ink-soft">{formatDate(c.createdAt, true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.pagination.totalPages > 1 && (
        <div className="flex justify-end border-t border-rule px-5 py-3">
          <Pagination current={page} total={data.pagination.total} pageSize={10} onChange={setPage} />
        </div>
      )}
    </Card>
  );
}
