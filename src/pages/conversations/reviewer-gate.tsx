import { ReactNode } from "react";
import { Lock } from "lucide-react";

import { useUserSlice } from "@/pages/auth/authSlice";
import { canReviewConversations, useGetMyAccessQuery } from "@/pages/staff/staff-api";
import { Card, EmptyState, Skeleton } from "@/common/ui/kit";

/**
 * Conversation review is for admins holding "Conversation review" by name,
 * never full access by default, never View only or country admins. The API
 * refuses everyone else (403, or 404 while the feature is off); this keeps a
 * direct URL from showing an empty page.
 */
export function ReviewerGate({ children }: { children: (myId: string | null) => ReactNode }) {
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user?.roles ?? null;
  const isAdmin = role === "admin";
  const { data: access, isLoading } = useGetMyAccessQuery(undefined, { skip: !isAdmin });
  if (isAdmin && isLoading) return <Card className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</Card>;
  if (!canReviewConversations(role, access)) return <NoAccess />;
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
