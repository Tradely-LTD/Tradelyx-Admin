import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";

import { useUserSlice } from "@/pages/auth/authSlice";
import { canReviewConversations, useGetMyAccessQuery } from "@/pages/staff/staff-api";
import { useGetConversationReviewSummaryQuery } from "./conversations-api";
import { Card, EmptyState, Skeleton } from "@/common/ui/kit";

/**
 * Conversation review is for admins holding "Conversation review" by name,
 * never full access by default, never View only or country admins, and only
 * while the feature is switched on. The page (header included) renders only
 * once GET /conversation-reviews/summary answers; anyone else, or everyone
 * while it is off (404), gets what any unknown admin URL gets: sent to the
 * dashboard, with no sign the feature exists. The API refuses them anyway.
 */
export function ReviewerGate({ children }: { children: (myId: string | null) => ReactNode }) {
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user?.roles ?? null;
  const isAdmin = role === "admin";
  const { data: access, isLoading: loadingAccess } = useGetMyAccessQuery(undefined, { skip: !isAdmin });
  const reviewer = canReviewConversations(role, access);
  const { isSuccess: on, isLoading: loadingSummary, error, refetch } = useGetConversationReviewSummaryQuery(undefined, { skip: !reviewer });
  const status = (error as { status?: number } | undefined)?.status;
  if ((isAdmin && loadingAccess) || (reviewer && loadingSummary)) {
    return <Card className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</Card>;
  }
  // Offline or a server error: retry. 403/404 fall through to "not here".
  if (reviewer && error && status !== 403 && status !== 404) {
    return (
      <Card>
        <EmptyState title="Could not load this page">
          Check your connection and try again.
          <button onClick={refetch} className="mt-3 block w-full cursor-pointer font-semibold text-brand-900 hover:underline">
            Try again
          </button>
        </EmptyState>
      </Card>
    );
  }
  if (!reviewer || !on) return <Navigate replace to="/" />;
  return <>{children((loginResponse?.user?.id as string | undefined) ?? null)}</>;
}

export function NoAccess({ title = "You don't have access to this conversation", children }: { title?: string; children?: ReactNode }) {
  return (
    <Card>
      <EmptyState icon={<Lock size={20} />} title={title}>
        {children ?? "Conversation review is granted by name to admins. Ask an admin who manages staff if you need it."}
      </EmptyState>
    </Card>
  );
}
