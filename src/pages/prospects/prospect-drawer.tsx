import { useState } from "react";
import { Instagram, Mail, MessageCircle, MessageSquareReply, StickyNote, Send } from "lucide-react";
import { toast } from "react-toastify";

import { Btn, Drawer, Pill, Skeleton, formatDate } from "@/common/ui/kit";
import { emailSubject, firstMessage, waNumber } from "./messages";
import { Channel, ProspectDetail, SOURCES, useAddProspectEventMutation, useEditProspectMutation, useGetProspectQuery, useMarkContactedMutation } from "./prospects-api";

/**
 * One prospect: fix their details, send a message you can edit first, log
 * what they reply (and who answered), and see everything that happened.
 */

const field = "w-full rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900";
const CHANNEL_LABEL: Record<string, string> = { instagram: "Instagram", whatsapp: "WhatsApp", email: "Email", call: "Call" };

export default function ProspectDrawer({ id, initialChannel, onClose }: { id: string; initialChannel?: Channel; onClose: () => void }) {
  const { data: p, isLoading } = useGetProspectQuery(id);
  return (
    <Drawer open onClose={onClose} title={p?.businessName ?? "Prospect"} subtitle={p ? [p.kind === "buyer" ? "Buyer" : "Seller", p.assigneeName && `with ${p.assigneeName}`].filter(Boolean).join(" · ") : undefined} width="max-w-[600px]">
      {isLoading || !p ? <Skeleton className="h-64" /> : <Body key={p.id} p={p} initialChannel={initialChannel} />}
    </Drawer>
  );
}

function Body({ p, initialChannel }: { p: ProspectDetail; initialChannel?: Channel }) {
  const channels = (["instagram", "whatsapp", "email"] as Channel[]).filter((c) => (c === "instagram" ? p.instagram : c === "whatsapp" ? p.phone : p.email));
  const [channel, setChannel] = useState<Channel | null>(initialChannel && channels.includes(initialChannel) ? initialChannel : channels[0] ?? null);
  const [message, setMessage] = useState(() => (channel ? firstMessage(p, channel) : ""));
  // Only a channel switch replaces the text; saving a reply or details keeps what was typed
  const pickChannel = (c: Channel) => {
    setChannel(c);
    setMessage(firstMessage(p, c));
  };

  const [markContacted] = useMarkContactedMutation();
  const send = async () => {
    if (!channel) return;
    if (channel === "instagram") {
      await navigator.clipboard.writeText(message).catch(() => undefined);
      toast.success("Message copied. Paste it in the Instagram chat that just opened.", { position: "top-right" });
      window.open(`https://ig.me/m/${p.instagram}`, "_blank", "noopener");
    } else if (channel === "whatsapp") {
      window.open(`https://wa.me/${waNumber(p.phone!)}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    } else {
      window.location.href = `mailto:${p.email}?subject=${encodeURIComponent(emailSubject(p))}&body=${encodeURIComponent(message)}`;
    }
    markContacted({ id: p.id, via: channel, message });
  };

  const done = p.status === "signed_up" || p.status === "already_user";

  return (
    <div className="space-y-7">
      {/* Re-mounts when saved details change, so the form shows what's stored */}
      <Details key={[p.businessName, p.contactName, p.instagram, p.phone, p.email, p.product, p.location, p.kind, p.source].join("|")} p={p} />

      {!done && (
        <section>
          <h3 className="mb-2 text-[14px] font-bold text-ink">Send a message</h3>
          {!channels.length ? (
            <p className="text-[13px] text-ink-faint">Add their Instagram, phone or email above to contact them.</p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {channels.map((c) => (
                  <button key={c} type="button" onClick={() => pickChannel(c)} aria-pressed={channel === c} className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${channel === c ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"}`}>
                    {CHANNEL_LABEL[c]}
                  </button>
                ))}
              </div>
              <label htmlFor="prospect-message" className="sr-only">Message</label>
              <textarea id="prospect-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={9} className={`${field} py-2.5 leading-relaxed`} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => channel && setMessage(firstMessage(p, channel))} className="cursor-pointer text-[12.5px] text-ink-soft underline-offset-2 hover:underline">Reset to the prepared message</button>
                <Btn icon={channel === "instagram" ? <Instagram size={15} /> : channel === "whatsapp" ? <MessageCircle size={15} /> : <Mail size={15} />} onClick={send} disabled={!message.trim()}>
                  {channel === "instagram" ? "Copy and open Instagram" : channel === "whatsapp" ? "Open WhatsApp" : "Open email"}
                </Btn>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-faint">Edit anything before sending. What you send is saved in the history below.</p>
            </>
          )}
        </section>
      )}

      <LogReply p={p} channels={channels} />
      <History p={p} />
    </div>
  );
}

function Details({ p }: { p: ProspectDetail }) {
  const [f, setF] = useState({
    businessName: p.businessName,
    contactName: p.contactName ?? "",
    instagram: p.instagram ? `@${p.instagram}` : "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    product: p.product ?? "",
    location: p.location ?? "",
    kind: p.kind,
    source: p.source,
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [save, { isLoading }] = useEditProspectMutation();
  const changed =
    f.businessName !== p.businessName || f.contactName !== (p.contactName ?? "") || f.instagram !== (p.instagram ? `@${p.instagram}` : "") ||
    f.phone !== (p.phone ?? "") || f.email !== (p.email ?? "") || f.product !== (p.product ?? "") || f.location !== (p.location ?? "") || f.kind !== p.kind || f.source !== p.source;

  const submit = async () => {
    setProblem(null);
    try {
      // Older rows may hold a free-text source the backend no longer accepts; leave those untouched.
      await save({ id: p.id, ...f, source: f.source in SOURCES ? f.source : undefined, instagram: f.instagram || null, phone: f.phone || null, email: f.email || null }).unwrap();
      toast.success("Saved", { position: "top-right" });
    } catch (err: any) {
      setProblem(err?.data?.error || "Could not save");
    }
  };

  const input = (key: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-[12.5px] font-semibold text-ink">
      {label}
      <input value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} className={`${field} mt-1 h-9 font-normal`} {...props} />
    </label>
  );

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-ink">Details</h3>
        <Pill tone={p.status === "signed_up" ? "green" : p.status === "replied" ? "orange" : p.status === "contacted" ? "blue" : "gray"} dot>
          {p.status.replace(/_/g, " ")}
        </Pill>
      </div>
      {problem && <p role="alert" className="mb-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-deep">{problem}</p>}
      <div className="grid grid-cols-2 gap-3">
        {input("businessName", "Business")}
        {input("contactName", "Person who answers", { placeholder: "e.g. Emmanuella" })}
        {input("instagram", "Instagram", { placeholder: "@handle" })}
        {input("phone", "Phone / WhatsApp", { inputMode: "tel", placeholder: "0803 123 4567" })}
        {input("email", "Email", { type: "email", placeholder: "name@business.com" })}
        {input("product", "Product", { placeholder: "e.g. sesame" })}
        {input("location", "Location", { placeholder: "e.g. Kano" })}
        <label className="block text-[12.5px] font-semibold text-ink">
          They are
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "seller" | "buyer" })} className={`${field} mt-1 h-9 cursor-pointer font-normal`}>
            <option value="seller">A seller</option>
            <option value="buyer">A buyer</option>
          </select>
        </label>
        <label className="block text-[12.5px] font-semibold text-ink">
          Found on
          <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className={`${field} mt-1 h-9 cursor-pointer font-normal`}>
            {Object.entries(SOURCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            {!(f.source in SOURCES) && <option value={f.source}>{f.source}</option>}
          </select>
        </label>
      </div>
      {changed && (
        <div className="mt-3 flex justify-end">
          <Btn size="sm" onClick={submit} loading={isLoading}>Save details</Btn>
        </div>
      )}
    </section>
  );
}

function LogReply({ p, channels }: { p: ProspectDetail; channels: Channel[] }) {
  const [kind, setKind] = useState<"reply" | "note">("reply");
  const [body, setBody] = useState("");
  const [who, setWho] = useState(p.contactName ?? "");
  const [channel, setChannel] = useState<string>(p.contactedVia ?? channels[0] ?? "whatsapp");
  const [save, { isLoading }] = useAddProspectEventMutation();

  const submit = async () => {
    try {
      await save({ id: p.id, kind, body, channel: kind === "reply" ? channel : null, contactName: kind === "reply" ? who || null : null }).unwrap();
      setBody("");
      toast.success(kind === "reply" ? "Reply saved" : "Note saved", { position: "top-right" });
    } catch (err: any) {
      toast.error(err?.data?.error || "Could not save", { position: "top-right" });
    }
  };

  return (
    <section>
      <div className="mb-2 flex gap-1.5">
        {([["reply", "They replied", MessageSquareReply], ["note", "Add a note", StickyNote]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${kind === k ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      {kind === "reply" && (
        <div className="mb-2 grid grid-cols-2 gap-3">
          <label className="block text-[12.5px] font-semibold text-ink">
            Who answered
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="e.g. Emmanuella" className={`${field} mt-1 h-9 font-normal`} />
          </label>
          <label className="block text-[12.5px] font-semibold text-ink">
            On
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${field} mt-1 h-9 cursor-pointer font-normal`}>
              {["whatsapp", "instagram", "email", "call"].map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
            </select>
          </label>
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={kind === "reply" ? "What they said, e.g. \"Please hold while we get back to you shortly\"" : "e.g. Call back on Monday; they export to Ghana"}
        className={`${field} py-2.5`}
      />
      <div className="mt-2 flex justify-end">
        <Btn size="sm" icon={<Send size={13} />} onClick={submit} loading={isLoading} disabled={!body.trim()}>
          {kind === "reply" ? "Save reply" : "Save note"}
        </Btn>
      </div>
    </section>
  );
}

function History({ p }: { p: ProspectDetail }) {
  const label = (e: ProspectDetail["events"][number]) =>
    e.kind === "sent" ? `Message sent${e.channel ? ` on ${CHANNEL_LABEL[e.channel] ?? e.channel}` : ""}` : e.kind === "reply" ? `They replied${e.channel ? ` on ${CHANNEL_LABEL[e.channel] ?? e.channel}` : ""}` : "Note";
  const dot = { sent: "bg-sky-500", reply: "bg-attention", note: "bg-ink-faint" } as const;
  return (
    <section>
      <h3 className="mb-3 text-[14px] font-bold text-ink">History</h3>
      {!p.events.length ? (
        <p className="text-[13px] text-ink-faint">Nothing yet. Added {formatDate(p.createdAt)}.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-rule pl-4">
          {p.events.map((e) => (
            <li key={e.id} className="relative text-[13px]">
              <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${dot[e.kind]}`} />
              <p className="font-semibold text-ink">{label(e)}</p>
              <p className="text-[12px] text-ink-faint">{formatDate(e.at, true)}{e.author ? ` · ${e.author}` : ""}</p>
              {e.body && <p className="mt-1 whitespace-pre-line rounded-lg bg-paper px-3 py-2 text-ink-soft">{e.body}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
