import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import Composer from "./components/composer";
import Campaigns from "./components/campaigns";
import EmailAllowance from "./components/email-allowance";
import { PageHeader, Tabs } from "@/common/ui/kit";

/**
 * Outreach: ready-made emails for people who haven't finished setting up,
 * and "what's new" emails for everyone. Links in:
 *   /outreach?template=seller_add_products          (dashboard "Email them")
 *   /outreach?template=…&user=<id>&name=Ada Obi       (a user's "Nudge")
 */
export default function OutreachPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"compose" | "campaigns">(params.get("tab") === "campaigns" ? "campaigns" : "compose");
  const userId = params.get("user");
  const person = userId ? { id: userId, name: params.get("name") || "this person" } : null;

  const clearPerson = () => {
    const next = new URLSearchParams(params);
    next.delete("user");
    next.delete("name");
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Outreach"
        description="Get people over the line: finish their store, list a product, verify, post a first request. Each email is personalised, carries an unsubscribe link, and never reaches the same person twice in a week."
      />
      <EmailAllowance />
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "compose", label: "Compose" },
            { value: "campaigns", label: "Campaigns" },
          ]}
        />
      </div>
      {tab === "compose" ? (
        <Composer initialTemplate={params.get("template")} initialPath={params.get("path")} person={person} onClearPerson={clearPerson} onSent={() => setTab("campaigns")} />
      ) : (
        <Campaigns />
      )}
    </>
  );
}
