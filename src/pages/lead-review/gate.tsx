import { ReactNode } from "react";
import { Lock } from "lucide-react";

import { Btn, Card, EmptyState, Skeleton } from "@/common/ui/kit";
import { type LeadReviewMe, useGetLeadReviewMeQuery } from "./lead-review-api";

/**
 * Lead review is granted one person at a time, by name; full access, any
 * role or level gives nothing (A1–A7). The pages render only once GET
 * /lead-review/me says this person holds it, so without it no lead endpoint
 * is ever called (A2).
 *
 * Unlike the conversation-review gate this doesn't redirect: the story asks
 * for a visible "no access" state. When access is removed while the page is
 * open, the next refused call flips the cached /me (lead-review-api
 * markNoAccess) and this gate swaps the page for the same state (A8).
 */
export function LeadReviewGate({ children }: { children: (me: LeadReviewMe) => ReactNode }) {
  const { data: me, isLoading, isError, refetch, isFetching } = useGetLeadReviewMeQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</Card>
      </div>
    );
  }
  // 503 PERMISSION_CHECK_FAILED or offline: unknown, not "no"
  if (isError && !me) {
    return (
      <Card>
        <EmptyState title="Couldn't check your access">
          Check your connection and try again.
          <span className="mt-3 block">
            <Btn size="sm" variant="secondary" loading={isFetching} onClick={() => refetch()}>
              Try again
            </Btn>
          </span>
        </EmptyState>
      </Card>
    );
  }
  if (!me?.access) return <NoLeadReviewAccess />;
  return <>{children(me)}</>;
}

export function NoLeadReviewAccess() {
  return (
    <Card>
      <EmptyState icon={<Lock size={20} />} title="You don't have access to Lead review">
        Ask an admin who manages staff.
      </EmptyState>
    </Card>
  );
}
