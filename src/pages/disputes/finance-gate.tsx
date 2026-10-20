import { ReactNode } from "react";
import { Lock } from "lucide-react";

import { useUserSlice } from "@/pages/auth/authSlice";
import { canSee, useGetMyAccessQuery } from "@/pages/staff/staff-api";
import { Card, EmptyState, Skeleton } from "@/common/ui/kit";
import { refusalOf } from "./disputes-api";

/**
 * Disputes are for admins with the Finance section only (statements and
 * evidence are private; decisions move money). The API refuses everyone else
 * with 403; this just says so plainly instead of showing an empty page.
 */
export function FinanceGate({ children }: { children: (myId: string | null) => ReactNode }) {
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user?.roles ?? null;
  const isAdmin = role === "admin";
  const { data: access, isLoading } = useGetMyAccessQuery(undefined, { skip: !isAdmin });
  if (isAdmin && isLoading) return <Card className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</Card>;
  if (!isAdmin || !canSee(access, "finance", true)) return <NoAccess />;
  return <>{children((loginResponse?.user?.id as string | undefined) ?? null)}</>;
}

export function NoAccess() {
  return (
    <Card>
      <EmptyState icon={<Lock size={20} />} title="Disputes need the Finance section">
        Only admins with Finance access can see or decide disputes. Ask an admin who manages staff to add it.
      </EmptyState>
    </Card>
  );
}

/** A load error: 403 is "no access", anything else a retry. */
export function LoadError({ error, onRetry, children }: { error: unknown; onRetry: () => void; children?: ReactNode }) {
  const r = refusalOf(error);
  if (r?.status === 403) return <NoAccess />;
  return (
    <Card>
      <EmptyState title={r?.status === 404 ? "This dispute doesn't exist" : "Could not load disputes"}>
        {r?.data?.message || children || "Check your connection and try again."}
        {r?.status !== 404 && (
          <button onClick={onRetry} className="mt-3 block w-full cursor-pointer font-semibold text-brand-900 hover:underline">
            Try again
          </button>
        )}
      </EmptyState>
    </Card>
  );
}
