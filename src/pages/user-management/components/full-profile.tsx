import { Link } from "react-router-dom";
import { BadgeCheck, Building2, Calendar, Edit2, ExternalLink, FileText, Globe, Image as ImageIcon, Mail, MapPin, Phone, ShieldAlert, Store } from "lucide-react";

import { Btn, Modal, Pill, Skeleton, formatDate, initials } from "@/common/ui/kit";
import { lastActive, roleTone } from "./user-drawer";
import { SellerCertificate, useGetUserProfileQuery, useGetUserQuery } from "../user-api";

/**
 * Everything we hold on one person, read-only: their account, and for a
 * seller the company, what buyers see on their store, and the compliance
 * papers only staff see.
 *
 * Reads the backend's own field names (phoneNo, roles, operatingCountry: the
 * raw users row from GET /profile/profile/:id; the seller shape from GET
 * /profile/profile/seller/:id). Company verification is not a switch here:
 * it is set when staff approve the seller's KYC, so this links to that review.
 */

const WEB = "https://web.tradelyx.com";

type RawUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNo: string | null;
  profileImage: string | null;
  roles: string | null;
  canSell: boolean | null;
  isKYCCompleted: boolean | null;
  isCompany: boolean | null;
  streetAddress: string | null;
  city: string | null;
  LGA: string | null;
  state: string | null;
  zipCode: string | null;
  operatingCountry: string | null;
  marketingOptOutAt: string | null;
  lastActiveAt: string | null;
  createdAt: string | null;
};

export default function FullProfile({ userId, onClose, onEdit }: { userId: string; onClose: () => void; onEdit: () => void }) {
  const { data, isLoading, isError } = useGetUserProfileQuery({ id: userId });
  const user = data?.data as RawUser | undefined;
  const isSeller = user?.roles === "seller" || !!user?.canSell;
  const seller = useGetUserQuery({ id: userId }, { skip: !isSeller });
  const company = seller.data?.companyInfo;
  const verified = !!company?.companyVerified;
  const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "Profile";

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      title={
        <div className="flex items-center gap-3">
          {company?.logo || user?.profileImage ? (
            <img src={(company?.logo || user?.profileImage) as string} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-rule" />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-950">{initials(user?.firstName, user?.lastName)}</div>
          )}
          <div className="min-w-0">
            <p className="truncate">{company?.name || name}</p>
            <p className="truncate text-[13px] font-normal text-ink-soft">{company?.name ? name : user?.email}</p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isSeller && !verified ? (
            <Link to={`/kyc?user=${userId}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-900 hover:underline">
              <ShieldAlert size={14} /> Review their KYC to verify the company
            </Link>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={onClose}>Close</Btn>
            <Btn size="sm" icon={<Edit2 size={13} />} onClick={onEdit}>Edit details</Btn>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      ) : isError || !user ? (
        <p className="py-10 text-center text-[14px] text-ink-soft">Couldn't load this profile.</p>
      ) : (
        <div className="space-y-7">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={roleTone(user.roles)}>{user.roles ?? "No role yet"}</Pill>
            <Pill tone={user.isKYCCompleted ? "green" : "gray"} dot>{user.isKYCCompleted ? "KYC verified" : "Not KYC verified"}</Pill>
            {isSeller && <Pill tone={verified ? "green" : "orange"} dot>{verified ? "Company verified" : "Company not verified"}</Pill>}
            {user.isCompany && <Pill tone="gray">Company account</Pill>}
            {user.marketingOptOutAt && <Pill tone="orange">Unsubscribed from outreach</Pill>}
          </div>

          <Section title="Account">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Fact icon={Mail} label="Email" value={<a href={`mailto:${user.email}`} className="text-brand-900 hover:underline">{user.email}</a>} />
              <Fact icon={Phone} label="Phone" value={user.phoneNo || "—"} />
              <Fact icon={MapPin} label="Address" value={address(user) || "—"} />
              <Fact icon={Globe} label="Operating country" value={user.operatingCountry || "—"} />
              <Fact icon={Calendar} label="Joined" value={formatDate(user.createdAt)} />
              <Fact icon={Calendar} label="Last active" value={lastActive(user.lastActiveAt)} />
            </dl>
          </Section>

          {isSeller &&
            (seller.isLoading ? (
              <Skeleton className="h-48" />
            ) : !seller.data ? (
              <p className="text-[13px] text-ink-soft">They haven't set up a seller profile yet.</p>
            ) : (
              <>
                <Section
                  title="Company"
                  action={
                    company?.storeSlug && (
                      <a href={`${WEB}/@${company.storeSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-900 hover:underline">
                        <Store size={13} /> Open their store <ExternalLink size={11} />
                      </a>
                    )
                  }
                >
                  {company?.banner && <img src={company.banner} alt="" className="mb-4 h-28 w-full rounded-xl object-cover ring-1 ring-rule" />}
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <Fact icon={Building2} label="Company name" value={company?.name || "—"} />
                    <Fact
                      icon={Globe}
                      label="Website"
                      value={company?.website ? <a href={withHttp(company.website)} target="_blank" rel="noopener noreferrer" className="text-brand-900 hover:underline">{company.website}</a> : "—"}
                    />
                    <Fact icon={FileText} label="Registration number" value={company?.registrationNumber || "—"} />
                    <Fact icon={Calendar} label="Incorporated" value={formatDate(company?.incorporationDate)} />
                    <Fact icon={Building2} label="Staff" value={seller.data.businessDetails?.totalStaff || "—"} />
                    <Fact icon={Building2} label="Annual revenue" value={seller.data.businessDetails?.estimatedAnnualRevenue || "—"} />
                  </dl>
                  {company?.overview && <p className="mt-4 whitespace-pre-line rounded-xl bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">{company.overview}</p>}
                  <div className="mt-4 space-y-3">
                    <Chips label="Main markets" items={seller.data.businessDetails?.mainMarkets} />
                    <Chips label="Services" items={seller.data.businessDetails?.services} />
                    <Chips label="Languages" items={seller.data.businessDetails?.languagesSpoken} />
                  </div>
                </Section>

                <Section title="Certificates buyers see">
                  {!company?.certifications?.length ? (
                    <p className="text-[13px] text-ink-faint">None added.</p>
                  ) : (
                    <ul className="divide-y divide-rule rounded-xl ring-1 ring-rule">
                      {company.certifications.map((c) => <Certificate key={c.id} c={c} />)}
                    </ul>
                  )}
                </Section>

                {!!company?.gallery?.length && (
                  <Section title="Gallery">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {company.gallery.map((src) => (
                        <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg ring-1 ring-rule">
                          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
                        </a>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title="Compliance documents" hint="Only staff see these.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Docs label="Company registration" files={seller.data.documents?.registrationDocuments} />
                    <Docs label="Export licence" files={seller.data.documents?.exportLicenses} />
                    <Docs label="Identity" files={seller.data.documents?.identityDocuments} />
                    <Docs label="Certification files" files={seller.data.documents?.certifications} />
                  </div>
                </Section>
              </>
            ))}
        </div>
      )}
    </Modal>
  );
}

const address = (u: RawUser) => [u.streetAddress, u.city, u.LGA, u.state, u.zipCode].filter(Boolean).join(", ");
const withHttp = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const asList = (v: string | string[] | null | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-bold text-ink">
          {title}
          {hint && <span className="ml-2 text-[12px] font-normal text-ink-faint">{hint}</span>}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-faint" />
      <div className="min-w-0">
        <dt className="text-[11.5px] text-ink-faint">{label}</dt>
        <dd className="break-words text-[13.5px] font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

function Chips({ label, items }: { label: string; items?: string[] | null }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] text-ink-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i} className="rounded-full bg-paper-deep px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">{i}</span>
        ))}
      </div>
    </div>
  );
}

function Certificate({ c }: { c: SellerCertificate }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold text-ink">{c.name || c.typeLabel}</p>
        <p className="truncate text-[12px] text-ink-faint">
          {[c.typeLabel !== c.name && c.typeLabel, c.issuer, c.number && `No. ${c.number}`, c.expiresAt && `${c.expired ? "Expired" : "Expires"} ${formatDate(c.expiresAt)}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {c.expired ? <Pill tone="red">Expired</Pill> : c.verified ? <Pill tone="green"><BadgeCheck size={12} /> Verified</Pill> : <Pill tone="gray">Not checked</Pill>}
        {c.fileUrl && (
          <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${c.name || c.typeLabel}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink">
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </li>
  );
}

function Docs({ label, files }: { label: string; files?: string | string[] | null }) {
  const list = asList(files);
  return (
    <div className="rounded-xl p-3 ring-1 ring-rule">
      <p className="mb-2 text-[12.5px] font-semibold text-ink">{label}</p>
      {!list.length ? (
        <p className="text-[12.5px] text-ink-faint">Not uploaded</p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((url, i) => {
            const file = decodeURIComponent(url.split("?")[0].split("/").pop() || `File ${i + 1}`);
            const isImage = /\.(jpe?g|png|gif|webp|svg)$/i.test(file);
            return (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-ink-soft hover:bg-paper hover:text-ink">
                  {isImage ? <ImageIcon size={14} className="shrink-0" /> : <FileText size={14} className="shrink-0" />}
                  <span className="truncate">{file}</span>
                  <ExternalLink size={11} className="ml-auto shrink-0 opacity-60" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
