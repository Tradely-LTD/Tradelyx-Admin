import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Btn, PageHeader } from "@/common/ui/kit";
import { appPaths } from "@/utils/app-paths";
import Composer from "@/pages/outreach/components/composer";
import type { Picked } from "./components/people-picker";

/**
 * Write to people you pick by hand. Sent through Outreach, so it gets the
 * same TradelyX layout, {{firstName}}, live preview, test send, unsubscribe
 * link, pacing and history as a campaign. Opened with ?user=<id>&name=…&email=…
 * (a user's profile) it starts with that person picked.
 */
const EmailComposePage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [picked, setPicked] = useState<Picked[]>(() => {
    const id = params.get("user");
    return id ? [{ id, name: params.get("name") || params.get("email") || "This person", email: params.get("email") || "" }] : [];
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="Write an email"
        description="To one person or a few you pick. It goes out in the TradelyX layout, with an unsubscribe link, and shows up in the history."
        actions={<Btn variant="secondary" icon={<ArrowLeft size={15} />} onClick={() => navigate(appPaths.emails)}>Direct email</Btn>}
      />
      <Composer picked={picked} onPickedChange={setPicked} onSent={() => navigate(appPaths.emails)} />
    </div>
  );
};

export default EmailComposePage;
