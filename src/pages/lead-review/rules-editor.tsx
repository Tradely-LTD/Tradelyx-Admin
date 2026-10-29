import { FormEvent, useEffect, useState } from "react";
import { EyeOff, Plus, Rocket, X } from "lucide-react";
import { toast } from "react-toastify";

import { Btn, Card } from "@/common/ui/kit";
import {
  type LeadReviewConfig,
  type Reapplied,
  type Rule,
  messageOf,
  useAddLeadRuleMutation,
  useRemoveLeadRuleMutation,
  useUpdateLeadReviewSettingsMutation,
} from "./lead-review-api";
import { RULE_MAX, THRESHOLD_MAX } from "./labels";

/**
 * The hide and boost lists and the unreviewed threshold (F9, I6). Staff who
 * hold Lead review only; agents never see this (F10, Q11) and the server
 * refuses them anyway. Every change re-applies at once to unreviewed leads
 * (Q7) and the toast says what moved.
 */
const reappliedText = (r: Reapplied) => `Re-applied: ${r.hidden} hidden, ${r.unhidden} un-hidden, ${r.boosted} boosted, ${r.unboosted} un-boosted`;

export default function RulesEditor({ config }: { config: LeadReviewConfig }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">Sorting lists</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Matched against each business's Google Maps category, whole words only, ignoring case: "farm" hides "Poultry farm" but not "Farmers market". Hide wins over boost. Changes
        apply straight away to leads nobody has reviewed yet; decided leads never change.
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <RuleList list="hide" rules={config.hide} />
        <RuleList list="boost" rules={config.boost} />
      </div>
      <Threshold value={config.threshold} />
    </Card>
  );
}

function RuleList({ list, rules }: { list: "hide" | "boost"; rules: Rule[] }) {
  const [term, setTerm] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [add, { isLoading: adding }] = useAddLeadRuleMutation();
  const [remove] = useRemoveLeadRuleMutation();
  const [removing, setRemoving] = useState<string | null>(null);
  const hide = list === "hide";
  const trimmed = term.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    setProblem(null);
    try {
      const r = await add({ list, term: trimmed }).unwrap();
      setTerm("");
      toast.success(reappliedText(r.data.reapplied), { position: "top-right" });
    } catch (err) {
      setProblem(messageOf(err, "Couldn't add it. Try again."));
    }
  };

  const drop = async (rule: Rule) => {
    setRemoving(rule.id);
    try {
      const r = await remove(rule.id).unwrap();
      toast.success(reappliedText(r.data.reapplied), { position: "top-right" });
    } catch (err) {
      toast.error(messageOf(err, "Couldn't remove it. Try again."), { position: "top-right" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section>
      <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
        {hide ? <EyeOff size={15} className="text-attention-deep" /> : <Rocket size={15} className="text-brand-900" />}
        {hide ? "Hide" : "Boost"}
        <span className="font-normal text-ink-faint">{hide ? "kept, but out of the queue until restored" : "shown first"}</span>
      </h3>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {!rules.length && <li className="text-[13px] italic text-ink-faint">Nothing on this list.</li>}
        {rules.map((r) => (
          <li key={r.id} className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-[12.5px] font-semibold ring-1 ring-inset ${hide ? "bg-attention-soft text-attention-deep ring-attention/25" : "bg-brand-50 text-brand-950 ring-brand-200"}`}>
            <span dir="auto">{r.term}</span>
            <button
              type="button"
              disabled={removing === r.id}
              onClick={() => drop(r)}
              aria-label={`Remove ${r.term} from the ${list} list`}
              className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-white/70 disabled:opacity-50"
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={RULE_MAX}
          placeholder={hide ? "e.g. poultry farm" : "e.g. rice mill"}
          aria-label={`Add to the ${list} list`}
          className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
        />
        <Btn type="submit" size="sm" variant="secondary" className="h-9" icon={<Plus size={14} />} loading={adding} disabled={!trimmed}>
          Add
        </Btn>
      </form>
      {problem && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-danger-deep">
          {problem}
        </p>
      )}
    </section>
  );
}

function Threshold({ value }: { value: number }) {
  const [draft, setDraft] = useState(String(value));
  const [problem, setProblem] = useState<string | null>(null);
  const [save, { isLoading }] = useUpdateLeadReviewSettingsMutation();
  useEffect(() => setDraft(String(value)), [value]);
  const n = Number(draft);
  const valid = /^\d+$/.test(draft.trim()) && n >= 0 && n <= THRESHOLD_MAX;

  return (
    <form
      className="mt-6 border-t border-rule pt-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setProblem(null);
        try {
          const r = await save({ unreviewedThreshold: n }).unwrap();
          toast.success(`Fetch more is now blocked above ${r.data.threshold} unreviewed leads`, { position: "top-right" });
        } catch (err) {
          setProblem(messageOf(err, "Couldn't save. Try again."));
        }
      }}
    >
      <label htmlFor="lead-threshold" className="block text-[13.5px] font-bold text-ink">
        Unreviewed threshold
      </label>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">Fetch more is blocked while a search has more unreviewed leads than this (skipped ones count, hidden ones don't).</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="lead-threshold"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputMode="numeric"
          className="tnum h-9 w-24 rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
        />
        <Btn type="submit" size="sm" variant="secondary" className="h-9" loading={isLoading} disabled={!valid || n === value}>
          Save
        </Btn>
        {!valid && draft.trim() !== "" && <span className="text-[12.5px] text-danger-deep">A whole number from 0 to {THRESHOLD_MAX}</span>}
      </div>
      {problem && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-danger-deep">
          {problem}
        </p>
      )}
    </form>
  );
}
