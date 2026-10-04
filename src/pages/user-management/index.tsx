import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "react-use";
import Pagination from "rc-pagination";
import { Edit2, Eye, HandHelping, Search, Users as UsersIcon, X } from "lucide-react";

import { useGetUsersQuery, User } from "./user-api";
import { SegmentKey, useGetSegmentUsersQuery, useGetSegmentsQuery } from "../outreach/outreach-api";
import { useUserSlice } from "../auth/authSlice";
import Modal from "@/common/modal/modal";
import TableDropdown from "@/common/dropdown";
import UserForm from "./components/user-form";
import SellerPreview from "./components/seller-preview";
import SellerProfileForm from "./components/seller-form";
import UserPreview from "./components/user-preview";
import UserDrawer, { lastActive, roleTone } from "./components/user-drawer";
import { Card, EmptyState, PageHeader, Pill, Skeleton, formatDate, formatNumber, initials } from "@/common/ui/kit";

type Row = User & { companyName?: string | null; optedOut?: boolean };

const ROLES = [
  { label: "All roles", value: "" },
  { label: "Buyers", value: "buyer" },
  { label: "Sellers", value: "seller" },
  { label: "Agents", value: "agent" },
  { label: "Admins", value: "admin" },
  { label: "No role yet", value: "null" },
];

const UserManagement = () => {
  const [params, setParams] = useSearchParams();
  const { loginResponse } = useUserSlice();
  const isAdmin = loginResponse?.user.roles === "admin";

  const segment = (isAdmin ? params.get("segment") : null) as SegmentKey | null;
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState("");
  const [verified, setVerified] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [selected, setSelected] = useState<Row | null>(null);
  const [modal, setModal] = useState<null | "edit" | "profile" | "onboard">(null);

  useDebounce(() => { setDebounced(search.trim()); setPage(1); }, 400, [search]);

  const { data: segments } = useGetSegmentsQuery(undefined, { skip: !isAdmin });
  const all = useGetUsersQuery({ page, limit, search: debounced, status: verified, role }, { skip: !!segment });
  const inSegment = useGetSegmentUsersQuery({ key: segment as SegmentKey, page, limit, search: debounced }, { skip: !segment });
  const { data, isFetching, isLoading } = segment ? inSegment : all;
  const rows = (data?.data ?? []) as Row[];
  const total = Number(data?.pagination?.total ?? 0);
  const segmentInfo = segments?.find((s) => s.key === segment);

  const setSegment = (key: string) => {
    const next = new URLSearchParams(params);
    if (key) next.set("segment", key);
    else next.delete("segment");
    setParams(next, { replace: true });
    setPage(1);
  };

  const open = (user: Row, which: typeof modal) => {
    setSelected(user);
    setModal(which);
  };

  const select =
    "h-10 cursor-pointer rounded-lg border-0 bg-white pl-3 pr-8 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900";

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Everyone on TradelyX. Open a person to see which setup steps they've done, and nudge them about the rest."
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or phone"
            aria-label="Search users"
            className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
        </div>
        {isAdmin && (
          <select value={segment ?? ""} onChange={(e) => setSegment(e.target.value)} className={select} aria-label="Stuck at">
            <option value="">Everyone</option>
            <optgroup label="Stuck at">
              {segments
                ?.filter((s) => s.group === "compliance")
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({formatNumber(s.count)})
                  </option>
                ))}
            </optgroup>
          </select>
        )}
        {!segment && (
          <>
            <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={select} aria-label="Role">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} className={select} aria-label="Email verified">
              <option value="">Verified or not</option>
              <option value="true">Verified</option>
              <option value="false">Not verified</option>
            </select>
          </>
        )}
        <div className="tnum text-[13px] text-ink-soft lg:ml-auto">{isLoading ? "" : `${formatNumber(total)} ${total === 1 ? "person" : "people"}`}</div>
      </div>

      {segmentInfo && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-attention-soft px-4 py-2.5 text-[13px] text-attention-deep ring-1 ring-inset ring-attention/20">
          <span>
            <strong>{segmentInfo.label}.</strong> {segmentInfo.description}
          </span>
          <button onClick={() => setSegment("")} className="inline-flex cursor-pointer items-center gap-1 font-semibold hover:underline">
            <X size={14} /> Clear
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                <th className="px-5 py-3">Person</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Country</th>
                <th className="px-3 py-3">KYC</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-3 py-3">Last active</th>
                <th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-rule transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-5 py-3"><Skeleton className="h-9" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={<UsersIcon size={20} />} title={segment ? "Nobody is stuck here" : "No users match"}>
                      {segment ? "Everyone has done this step." : "Try another search or clear the filters."}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} onClick={() => setSelected(u)} className="cursor-pointer transition-colors hover:bg-brand-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-deep text-[12px] font-bold text-ink-soft">{initials(u.firstName, u.lastName)}</div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}</p>
                          <p className="truncate text-[12.5px] text-ink-soft">{u.companyName || u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Pill tone={roleTone(u.role)}>{u.role ?? "none"}</Pill></td>
                    <td className="tnum px-3 py-3 text-ink-soft">{u.phone || "—"}</td>
                    <td className="px-3 py-3 text-ink-soft">{u.country || "—"}</td>
                    <td className="px-3 py-3">{u.isKYCCompleted ? <Pill tone="green" dot>Verified</Pill> : <Pill tone="gray" dot>No</Pill>}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{formatDate(u.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{u.lastActiveAt ? lastActive(u.lastActiveAt) : <span className="text-ink-faint">—</span>}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <TableDropdown
                        items={[
                          { label: "Edit user", icon: <Edit2 size={16} />, action: () => open(u, "edit") },
                          { label: "Full profile", icon: <Eye size={16} />, action: () => open(u, "profile") },
                          ...(u.role === "seller" ? [{ label: "Onboard as seller", icon: <HandHelping size={16} />, action: () => open(u, "onboard") }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-3">
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className={`${select} h-8 text-[12.5px]`} aria-label="Rows per page">
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
          </select>
          <Pagination current={page} total={total} pageSize={limit} onChange={setPage} showSizeChanger={false} />
        </div>
      </Card>

      {selected && !modal && (
        <UserDrawer
          user={selected}
          canOutreach={isAdmin}
          onClose={() => setSelected(null)}
          onEdit={() => setModal("edit")}
          onProfile={() => setModal("profile")}
          onOnboard={() => setModal("onboard")}
        />
      )}

      <Modal isOpen={modal === "edit"} onClose={() => setModal(null)} title="Edit user">
        <UserForm id={selected?.id ?? ""} onClose={() => setModal(null)} />
      </Modal>
      <Modal isOpen={modal === "profile"} onClose={() => setModal(null)} title={selected?.role === "seller" ? "Seller profile" : "User profile"} className="!max-w-[800px]">
        {selected?.role === "seller" ? (
          <SellerPreview sellerId={selected.id} onClose={() => setModal(null)} />
        ) : (
          <UserPreview userId={selected?.id ?? ""} onClose={() => setModal(null)} />
        )}
      </Modal>
      <Modal isOpen={modal === "onboard"} onClose={() => setModal(null)} title="Onboard seller" className="!max-w-[800px]">
        <SellerProfileForm onClose={() => setModal(null)} id={selected?.id} />
      </Modal>
    </>
  );
};

export default UserManagement;
