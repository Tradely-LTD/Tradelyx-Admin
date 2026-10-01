import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Check, FileText, Info, Send, TestTube2, UserRound, X } from "lucide-react";

import {
  BlockKey,
  Draft,
  errorMessage,
  Preview,
  SegmentKey,
  Target,
  Template,
  useCreateCampaignMutation,
  useGetSegmentsQuery,
  useGetTemplatesQuery,
  usePreviewEmailMutation,
  useSendTestEmailMutation,
} from "../outreach-api";
import { Btn, Card, Confirm, Skeleton, formatNumber } from "@/common/ui/kit";

type State = {
  templateKey: string | null;
  segment: SegmentKey;
  subject: string;
  body: string;
  buttonLabel: string;
  buttonPath: string;
  block: BlockKey | "";
};

const BLANK: State = { templateKey: null, segment: "everyone", subject: "", body: "Hi {{firstName}},\n\n", buttonLabel: "", buttonPath: "", block: "" };

const fromTemplate = (t: Template): State => ({
  templateKey: t.key,
  segment: t.segment,
  subject: t.subject,
  body: t.body,
  buttonLabel: t.button?.label ?? "",
  buttonPath: t.button?.path ?? "",
  block: t.block ?? "",
});

const toDraft = (s: State): Draft => ({
  templateKey: s.templateKey,
  subject: s.subject,
  body: s.body,
  button: s.buttonLabel || s.buttonPath ? { label: s.buttonLabel, path: s.buttonPath } : null,
  block: s.block || null,
});

type Props = {
  initialTemplate?: string | null;
  /** Overrides the template's button link, e.g. /rfq/<id> for a nudge about one request */
  initialPath?: string | null;
  person?: { id: string; name: string } | null;
  onClearPerson: () => void;
  onSent: () => void;
};

export default function Composer({ initialTemplate, initialPath, person, onClearPerson, onSent }: Props) {
  const { data: templates, isLoading: templatesLoading } = useGetTemplatesQuery();
  const { data: segments } = useGetSegmentsQuery();
  const [state, setState] = useState<State>(BLANK);
  const [edited, setEdited] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [preview, { isLoading: previewLoading, error: previewError }] = usePreviewEmailMutation();
  const [sendTest, { isLoading: testing }] = useSendTestEmailMutation();
  const [createCampaign, { isLoading: sending }] = useCreateCampaignMutation();
  const [latest, setLatest] = useState<Preview | null>(null);

  // Start from the template in the link (dashboard "Email them", a user's "Nudge")
  useEffect(() => {
    if (!templates || !initialTemplate) return;
    const t = templates.data.find((x) => x.key === initialTemplate);
    if (t) {
      const base = fromTemplate(t);
      setState(initialPath && initialPath.startsWith("/") ? { ...base, buttonPath: initialPath } : base);
      setEdited(false);
    }
  }, [templates, initialTemplate, initialPath]);

  const target: Target = person ? { userId: person.id } : { segment: state.segment };
  const draft = useMemo(() => toDraft(state), [state]);
  const ready = state.subject.trim() && state.body.trim();

  // Live preview, rendered by the server exactly as it will be sent
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      preview({ ...draft, ...target })
        .unwrap()
        .then(setLatest)
        .catch(() => undefined);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, state.segment, person?.id, ready]);

  const set = (patch: Partial<State>) => {
    setState((s) => ({ ...s, ...patch }));
    setEdited(true);
  };

  const pick = (t: Template | null) => {
    if (edited && !window.confirm("Replace what you've written with this template?")) return;
    setState(t ? fromTemplate(t) : { ...BLANK, segment: state.segment });
    setEdited(false);
  };

  const insertToken = (token: string) => {
    const el = bodyRef.current;
    if (!el) return set({ body: state.body + token });
    const { selectionStart: a, selectionEnd: b } = el;
    const body = state.body.slice(0, a) + token + state.body.slice(b);
    set({ body });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  };

  const recipients = latest?.recipients ?? 0;
  const segment = segments?.find((s) => s.key === state.segment);

  const doSend = async () => {
    try {
      const res = await createCampaign({ ...draft, ...target, expectedRecipients: recipients }).unwrap();
      toast.success(res.message, { position: "top-right" });
      setConfirming(false);
      setEdited(false);
      onSent();
    } catch (err) {
      setConfirming(false);
      toast.error(errorMessage(err, "Could not send"), { position: "top-right" });
      preview({ ...draft, ...target }).unwrap().then(setLatest).catch(() => undefined);
    }
  };

  const groups: { label: string; group: Template["group"] }[] = [
    { label: "Finish setting up", group: "compliance" },
    { label: "What's new", group: "engagement" },
  ];

  const field =
    "w-full rounded-lg border-0 bg-white px-3 text-sm text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      <div className="min-w-0 space-y-6">
        {/* 1 · Template */}
        <Step n={1} title="Start from a template" hint="Each one is written for a step people get stuck on. Edit anything before sending.">
          {templatesLoading ? (
            <div className="grid gap-2 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[68px]" />)}</div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.group}>
                  <p className="eyebrow mb-2">{g.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {templates?.data
                      .filter((t) => t.group === g.group)
                      .map((t) => (
                        <TemplateCard key={t.key} active={state.templateKey === t.key} onClick={() => pick(t)} title={t.name} sub={t.audience.label} />
                      ))}
                  </div>
                </div>
              ))}
              <TemplateCard active={state.templateKey === null} onClick={() => pick(null)} title="Blank email" sub="Write your own" icon />
            </div>
          )}
        </Step>

        {/* 2 · Audience */}
        <Step n={2} title="Who it goes to">
          {person ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3 ring-1 ring-inset ring-brand-200">
              <div className="flex items-center gap-2.5 text-sm">
                <UserRound size={16} className="text-brand-900" />
                <span className="font-semibold text-ink">Only {person.name}</span>
              </div>
              <Btn size="sm" variant="ghost" icon={<X size={14} />} onClick={onClearPerson}>
                Send to an audience instead
              </Btn>
            </div>
          ) : (
            <>
              <select
                value={state.segment}
                onChange={(e) => set({ segment: e.target.value as SegmentKey })}
                className={`${field} h-10 cursor-pointer`}
                aria-label="Audience"
              >
                {(["compliance", "engagement"] as const).map((group) => (
                  <optgroup key={group} label={group === "compliance" ? "Haven't finished a step" : "Everyone of a kind"}>
                    {segments
                      ?.filter((s) => s.group === group)
                      .map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label} ({formatNumber(s.count - s.optedOut)})
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              {segment && (
                <p className="mt-2 text-[12.5px] text-ink-soft">
                  {segment.description}
                  {segment.optedOut > 0 && ` ${formatNumber(segment.optedOut)} unsubscribed and are left out.`}
                </p>
              )}
            </>
          )}
        </Step>

        {/* 3 · Message */}
        <Step n={3} title="The message">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="subject">Subject</label>
              <input id="subject" value={state.subject} onChange={(e) => set({ subject: e.target.value })} maxLength={200} className={`${field} h-10`} />
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label className="text-[13px] font-semibold text-ink" htmlFor="body">Message</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] text-ink-faint">Insert</span>
                  {["{{firstName}}", "{{companyName}}"].map((t) => (
                    <button key={t} type="button" onClick={() => insertToken(t)} className="cursor-pointer rounded-md bg-paper-deep px-2 py-0.5 font-mono text-[11.5px] text-ink-soft hover:bg-brand-50 hover:text-brand-950">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="body"
                ref={bodyRef}
                value={state.body}
                onChange={(e) => set({ body: e.target.value })}
                rows={11}
                maxLength={5000}
                className={`${field} resize-y py-2.5 leading-relaxed`}
              />
              <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-ink-faint">
                <Info size={13} className="mt-px shrink-0" />
                Plain text. Leave a blank line between paragraphs; start lines with "- " for a list. Names fall back to "there" and "your business".
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="btnLabel">Button text</label>
                <input id="btnLabel" value={state.buttonLabel} onChange={(e) => set({ buttonLabel: e.target.value })} placeholder="Open TradelyX" maxLength={60} className={`${field} h-10`} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="btnPath">Button link</label>
                <input id="btnPath" value={state.buttonPath} onChange={(e) => set({ buttonPath: e.target.value })} placeholder="/dashboard" className={`${field} h-10 font-mono text-[13px]`} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="block">Include live listings</label>
              <select id="block" value={state.block} onChange={(e) => set({ block: e.target.value as BlockKey | "" })} className={`${field} h-10 cursor-pointer`}>
                <option value="">None</option>
                {templates?.blocks.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label} (five newest, at send time)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Step>
      </div>

      {/* Preview and send */}
      <div className="min-w-0 xl:sticky xl:top-2 xl:self-start">
        <Card className="overflow-hidden">
          <div className="border-b border-rule px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Preview</p>
              {previewLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-faint border-r-transparent" aria-label="Updating" />}
            </div>
            <p className="mt-1.5 truncate text-[15px] font-semibold text-ink" title={latest?.subject}>
              {ready ? latest?.subject ?? "…" : "Add a subject and a message"}
            </p>
            {latest?.sampleName && <p className="mt-0.5 text-[12px] text-ink-faint">As {latest.sampleName} will see it</p>}
          </div>
          <div className="bg-paper px-3 py-3">
            {ready && latest ? (
              <iframe title="Email preview" srcDoc={`<body style="margin:16px;background:#fff">${latest.html}</body>`} className="h-[440px] w-full rounded-lg bg-white ring-1 ring-rule" sandbox="" />
            ) : (
              <div className="grid h-[440px] place-items-center rounded-lg bg-white text-sm text-ink-faint ring-1 ring-rule">
                {previewError ? <span className="px-6 text-center text-danger">{errorMessage(previewError, "Preview failed")}</span> : "Your email appears here"}
              </div>
            )}
          </div>
          {latest?.emptyBlock && (
            <p className="border-t border-rule bg-attention-soft px-5 py-2.5 text-[12.5px] text-attention-deep">There are no listings for this block right now, so it would be empty.</p>
          )}
          <div className="space-y-3 border-t border-rule px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">Will reach</span>
              <span className="tnum font-bold text-ink">
                {latest ? `${formatNumber(recipients)} ${recipients === 1 ? "person" : "people"}` : "—"}
              </span>
            </div>
            {latest && recipients === 0 && (
              <p className="text-[12.5px] text-ink-soft">
                {person ? "This person unsubscribed, or already got this template in the last 7 days." : "Nobody right now: everyone in this audience unsubscribed or got this template in the last 7 days."}
              </p>
            )}
            <div className="flex gap-2">
              <Btn variant="secondary" icon={<TestTube2 size={15} />} loading={testing} disabled={!ready} onClick={() => sendTest({ ...draft, ...target })} className="flex-1">
                Send me a test
              </Btn>
              <Btn icon={<Send size={15} />} disabled={!ready || !latest || recipients === 0 || previewLoading} onClick={() => setConfirming(true)} className="flex-1">
                Send
              </Btn>
            </div>
          </div>
        </Card>
      </div>

      <Confirm
        open={confirming}
        title={`Send to ${formatNumber(recipients)} ${recipients === 1 ? "person" : "people"}?`}
        confirmLabel="Send now"
        loading={sending}
        onCancel={() => setConfirming(false)}
        onConfirm={doSend}
      >
        <p>
          <strong className="text-ink">{latest?.subject}</strong>
        </p>
        <p className="mt-2">
          {person ? `Goes to ${person.name} only.` : `Goes to ${segment?.label.toLowerCase() ?? "this audience"}.`} It can't be recalled once sent. Each email has an
          unsubscribe link, and nobody gets the same template twice within 7 days.
        </p>
      </Confirm>
    </div>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-950 text-[12px] font-bold text-white">{n}</span>
        <div>
          <h3 className="text-[15px] font-bold leading-6 text-ink">{title}</h3>
          {hint && <p className="text-[12.5px] text-ink-soft">{hint}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function TemplateCard({ active, onClick, title, sub, icon }: { active: boolean; onClick: () => void; title: string; sub: string; icon?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3.5 py-3 text-left transition-all duration-150 ${
        active ? "bg-brand-50 ring-2 ring-brand-900" : "bg-white ring-1 ring-rule hover:ring-ink-faint/60"
      }`}
    >
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${active ? "bg-brand-900 text-white" : "bg-paper-deep text-ink-faint"}`}>
        {active ? <Check size={12} strokeWidth={3} /> : icon ? <FileText size={11} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[12px] text-ink-soft">{sub}</span>
      </span>
    </button>
  );
}

