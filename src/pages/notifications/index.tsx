import { useState } from "react";
import Pagination from "rc-pagination";
import { toast } from "react-toastify";
import { Bell, Link2, Send, Smartphone } from "lucide-react";

import { LIMITS, useGetBroadcastAudienceQuery, useGetBroadcastsQuery, useSendBroadcastMutation } from "./notification-api";
import { SegmentKey, errorMessage, useGetSegmentsQuery } from "../outreach/outreach-api";
import { Btn, Card, Confirm, EmptyState, PageHeader, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";

/**
 * Push notifications: a short message to people's phones and their TradelyX
 * inbox, for one audience, opening a page when tapped. Best for things that
 * are timely (new requests, fresh offers); longer messages belong in Outreach.
 */

const DESTINATIONS: { value: string; label: string }[] = [
  { value: "", label: "Nowhere in particular (opens the inbox)" },
  { value: "/marketplace", label: "Marketplace" },
  { value: "/offers", label: "Sell offers" },
  { value: "/rfq/new", label: "Post a request" },
  { value: "/seller/requests", label: "Requests for you (sellers)" },
  { value: "/seller/products/new", label: "Add a product (sellers)" },
  { value: "/seller/setup", label: "Store setup (sellers)" },
  { value: "/account/verification", label: "ID verification" },
  { value: "custom", label: "Another page…" },
];

export default function NotificationManagement() {
  const [segment, setSegment] = useState<SegmentKey>("everyone");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [destination, setDestination] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: segments } = useGetSegmentsQuery();
  const { data: reach, isFetching: reachLoading } = useGetBroadcastAudienceQuery(segment);
  const { data: history, isLoading: historyLoading } = useGetBroadcastsQuery({ page, limit: 10 });
  const [send, { isLoading: sending }] = useSendBroadcastMutation();

  const path = destination === "custom" ? customPath.trim() : destination;
  const ready = title.trim() && message.trim() && title.length <= LIMITS.title && message.length <= LIMITS.message && (destination !== "custom" || /^\/(?!\/)/.test(path));
  const audience = segments?.find((s) => s.key === segment);

  const doSend = async () => {
    setError(null);
    try {
      const res = await send({ title: title.trim(), message: message.trim(), segment, path: path || null }).unwrap();
      toast.success(res.message, { position: "top-right" });
      setConfirming(false);
      setTitle("");
      setMessage("");
      setDestination("");
      setCustomPath("");
    } catch (err) {
      setConfirming(false);
      setError(errorMessage(err, "Could not send the notification"));
    }
  };

  const field =
    "w-full rounded-lg border-0 bg-white px-3 text-sm text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900";
  const counter = (n: number, max: number) => (
    <span className={`tnum text-[11.5px] ${n > max ? "font-semibold text-danger" : n > max * 0.85 ? "text-attention-deep" : "text-ink-faint"}`}>
      {n}/{max}
    </span>
  );

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Push notifications"
        description="A short, timely message to people's phones and TradelyX inbox. Pick who gets it and where it opens. For anything longer, use Outreach."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="space-y-5 p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="segment">Who gets it</label>
            <select id="segment" value={segment} onChange={(e) => setSegment(e.target.value as SegmentKey)} className={`${field} h-10 cursor-pointer`}>
              {(["engagement", "compliance"] as const).map((group) => (
                <optgroup key={group} label={group === "engagement" ? "Everyone of a kind" : "Haven't finished a step"}>
                  {segments?.filter((s) => s.group === group).map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
              <Smartphone size={13} />
              {reachLoading || !reach ? "Counting…" : `${formatNumber(reach.people)} ${reach.people === 1 ? "person" : "people"}; ${formatNumber(reach.withApp)} with the app get a phone alert, the rest see it in their inbox.`}
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="text-[13px] font-semibold text-ink" htmlFor="title">Title</label>
              {counter(title.length, LIMITS.title)}
            </div>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Buyers want sesame this week" className={`${field} h-10`} />
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="text-[13px] font-semibold text-ink" htmlFor="message">Message</label>
              {counter(message.length, LIMITS.message)}
            </div>
            <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="12 new requests for sesame and cashew. Quote before they close." className={`${field} resize-y py-2.5 leading-relaxed`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="destination">Opens</label>
              <select id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} className={`${field} h-10 cursor-pointer`}>
                {DESTINATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            {destination === "custom" && (
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="path">Page on TradelyX</label>
                <input id="path" value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="/offers/…" className={`${field} h-10 font-mono text-[13px]`} />
              </div>
            )}
          </div>

          {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-deep">{error}</p>}

          <div className="flex justify-end border-t border-rule pt-4">
            <Btn icon={<Send size={15} />} disabled={!ready || !reach?.people} onClick={() => setConfirming(true)}>
              Send notification
            </Btn>
          </div>
        </Card>

        {/* Preview: a phone lock-screen alert, and the inbox row */}
        <div className="space-y-4 xl:sticky xl:top-2 xl:self-start">
          <p className="eyebrow">Preview</p>
          <div className="rounded-[28px] bg-gradient-to-b from-brand-950 to-[#0b4a2e] p-4 shadow-lift">
            <p className="mb-6 mt-2 text-center text-[40px] font-light leading-none text-white/90 tnum">09:41</p>
            <div className="rounded-2xl bg-white/85 p-3 backdrop-blur">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-soft">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-900 text-[10px] font-extrabold text-white">X</span>
                TradelyX · now
              </div>
              <p className="truncate text-[13.5px] font-semibold text-ink">{title || "Your title"}</p>
              <p className="line-clamp-3 text-[13px] leading-snug text-ink-soft">{message || "Your message shows here. Keep it to one or two sentences."}</p>
            </div>
          </div>
          <Card className="flex items-start gap-3 p-3.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-900"><Bell size={15} /></span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-ink">{title || "Your title"}</p>
              <p className="line-clamp-2 text-[12.5px] text-ink-soft">{message || "In the TradelyX inbox"}</p>
              {path && <p className="mt-1 flex items-center gap-1 text-[11.5px] text-brand-900"><Link2 size={11} /> opens {path}</p>}
            </div>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-bold text-ink">Sent</h2>
        <Card className="overflow-hidden">
          {historyLoading ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !history?.data.length ? (
            <EmptyState icon={<Bell size={20} />} title="Nothing sent yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                    <th className="px-5 py-3">Notification</th>
                    <th className="px-3 py-3">Sent</th>
                    <th className="px-3 py-3">Reached</th>
                    <th className="px-3 py-3">Opened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {history.data.map((b, i) => {
                    const rate = b.recipients ? Math.round((b.read / b.recipients) * 100) : 0;
                    return (
                      <tr key={`${b.sentAt}-${i}`} className="align-top">
                        <td className="max-w-[440px] px-5 py-3">
                          <p className="truncate font-semibold text-ink">{b.title || "Untitled"}</p>
                          <p className="line-clamp-2 text-[12.5px] text-ink-soft">{b.message}</p>
                          {b.path && <p className="mt-0.5 font-mono text-[11.5px] text-ink-faint">{b.path}</p>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{formatDate(b.sentAt, true)}</td>
                        <td className="tnum px-3 py-3 text-ink-soft">{formatNumber(b.recipients)}</td>
                        <td className="w-[180px] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
                              <div className="h-full rounded-full bg-brand-700" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="tnum text-[12px] text-ink-soft">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {(history?.pagination.totalPages ?? 0) > 1 && (
            <div className="flex justify-end border-t border-rule px-5 py-3">
              <Pagination current={page} total={history!.pagination.total} pageSize={10} onChange={setPage} />
            </div>
          )}
        </Card>
      </section>

      <Confirm
        open={confirming}
        title={`Send to ${formatNumber(reach?.people)} ${reach?.people === 1 ? "person" : "people"}?`}
        confirmLabel="Send now"
        loading={sending}
        onCancel={() => setConfirming(false)}
        onConfirm={doSend}
      >
        <strong className="text-ink">{title}</strong> goes to {audience?.label.toLowerCase() ?? "this audience"}: {formatNumber(reach?.withApp)} phone
        {reach?.withApp === 1 ? "" : "s"} and every inbox. A push can't be taken back once sent.
      </Confirm>
    </>
  );
}
