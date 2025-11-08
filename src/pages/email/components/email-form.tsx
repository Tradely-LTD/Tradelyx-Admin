import { FormEvent } from "react";
import { Globe, Mail, Search, Shield, Users } from "lucide-react";
import Button from "@/common/button/button";
import Input, { SelectOption } from "@/common/input/input";
import Text from "@/common/text/text";
import { Loader } from "@/common/loader/loader";
import { EmailComposerMode, SelectedEmailUser } from "@/hooks/email";
import { SendAllEmailFilters } from "@/pages/email/email-api";
import type { MultiValue, SingleValue } from "react-select";

interface EmailFormProps {
  mode: EmailComposerMode;
  onModeChange: (mode: EmailComposerMode) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  body: string;
  onBodyChange: (body: string) => void;
  isHtml: boolean;
  onIsHtmlChange: (value: boolean) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  availableUsers: SelectedEmailUser[];
  selectedUsers: SelectedEmailUser[];
  toggleUserSelection: (user: SelectedEmailUser) => void;
  clearSelectedUsers: () => void;
  filters: SendAllEmailFilters;
  onFiltersChange: (filters: SendAllEmailFilters) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => Promise<void> | void;
  usersLoading?: boolean;
}

const emailModes: { value: EmailComposerMode; label: string; description: string }[] = [
  {
    value: "individual",
    label: "Individual",
    description: "Send a customised email to a single recipient.",
  },
  {
    value: "bulk",
    label: "Bulk",
    description: "Select multiple users to receive the same email.",
  },
  {
    value: "all_users",
    label: "All Users",
    description: "Broadcast an email to everyone (optional filters available).",
  },
];

const roleOptions: SelectOption[] = [
  { label: "Any role", value: "" },
  { label: "Buyer", value: "buyer" },
  { label: "Seller", value: "seller" },
];

const verificationOptions: SelectOption[] = [
  { label: "Any verification status", value: "" },
  { label: "Verified", value: "true" },
  { label: "Not verified", value: "false" },
];

const EmailForm = ({
  mode,
  onModeChange,
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  isHtml,
  onIsHtmlChange,
  searchTerm,
  onSearchTermChange,
  availableUsers,
  selectedUsers,
  toggleUserSelection,
  clearSelectedUsers,
  filters,
  onFiltersChange,
  canSubmit,
  isSubmitting,
  onSubmit,
  usersLoading,
}: EmailFormProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleModeChange = (newMode: EmailComposerMode) => {
    if (isSubmitting) {
      return;
    }
    onModeChange(newMode);
  };

  const extractSelectValue = (
    option: SingleValue<SelectOption> | MultiValue<SelectOption> | null
  ): string | undefined => {
    if (!option) {
      return undefined;
    }

    if (Array.isArray(option)) {
      return option[0]?.value?.toString();
    }

    const singleOption = option as SelectOption;
    return singleOption.value?.toString();
  };

  const handleFilterChange = (
    key: keyof SendAllEmailFilters,
    rawValue: string | undefined
  ) => {
    let value: SendAllEmailFilters[keyof SendAllEmailFilters];

    if (key === "isVerified") {
      if (!rawValue) {
        value = undefined;
      } else {
        value = rawValue === "true";
      }
    } else if (rawValue && rawValue.trim()) {
      value = rawValue.trim();
    } else {
      value = undefined;
    }

    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Text h2 className="block mb-3">
          Email Mode
        </Text>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {emailModes.map((modeOption) => (
            <button
              key={modeOption.value}
              type="button"
              onClick={() => handleModeChange(modeOption.value)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                mode === modeOption.value
                  ? "border-[#029150] bg-[#029150]/10 text-[#143085]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#029150]/40"
              }`}
            >
              <Text block h3 className="block mb-1">
                {modeOption.label}
              </Text>
              <Text className="block text-sm text-gray-500">{modeOption.description}</Text>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <Input
                type="text"
                label="Subject"
                placeholder="Enter email subject"
                value={subject}
                onChange={(event) => onSubjectChange(event.target.value)}
                leftIcon={<Mail size={16} />}
                classNameWrapper="w-full lg:max-w-lg"
                required
              />
              <div className="flex items-center gap-2 lg:justify-end">
                <Text h3 block className="text-sm font-medium text-gray-600">Content format</Text>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onIsHtmlChange(true)}
                    className={`rounded-full border px-4 py-1 text-sm ${
                      isHtml ? "border-[#029150] bg-[#029150]/10 text-[#143085]" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => onIsHtmlChange(false)}
                    className={`rounded-full border px-4 py-1 text-sm ${
                      !isHtml ? "border-[#029150] bg-[#029150]/10 text-[#143085]" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    Plain text
                  </button>
                </div>
              </div>
            </div>

            <Input
              type="textarea"
              label="Message"
              placeholder="Write the email content here..."
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              rows={mode === "all_users" ? 14 : 12}
              fullWidth
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <Text block className="text-gray-600">
              {mode === "all_users"
                ? "This email will be sent to all users that match the filters on the right."
                : selectedUsers.length === 0
                ? "Select at least one recipient to enable sending."
                : `Ready to send to ${selectedUsers.length} user${selectedUsers.length === 1 ? "" : "s"}.`}
            </Text>
            <Button type="submit" loading={isSubmitting} disabled={!canSubmit || isSubmitting}>
              Send Email
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          {mode === "all_users" ? (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <Text h3 block className="text-lg font-semibold text-gray-800">Audience filters</Text>
              <Input
                type="select"
                value={roleOptions.find((option) => option.value === (filters.role ?? "")) ?? roleOptions[0]}
                onSelectChange={(option) => handleFilterChange("role", extractSelectValue(option))}
                options={roleOptions}
                label="Role"
                fullWidth
              />
              <Input
                type="select"
                value={
                  verificationOptions.find((option) =>
                    option.value === ""
                      ? filters.isVerified === undefined
                      : option.value === "true"
                      ? filters.isVerified === true
                      : filters.isVerified === false
                  ) ?? verificationOptions[0]
                }
                onSelectChange={(option) => handleFilterChange("isVerified", extractSelectValue(option))}
                options={verificationOptions}
                label="Verification status"
                fullWidth
              />
              <Input
                type="text"
                value={filters.country ?? ""}
                onChange={(event) => handleFilterChange("country", event.target.value)}
                placeholder="e.g. Nigeria"
                label="Country (optional)"
                fullWidth
              />
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    type="text"
                    placeholder="Search users by name, email or phone"
                    value={searchTerm}
                    onChange={(event) => onSearchTermChange(event.target.value)}
                    leftIcon={<Search size={16} />}
                    classNameWrapper="w-full"
                  />
                  {selectedUsers.length > 0 && (
                    <Button variant="ghost" onClick={clearSelectedUsers}>
                      Clear selection
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#143085]" />
                    <Text h3 block>{mode === "individual" ? "Select 1 user" : "Select multiple users"}</Text>
                  </div>
                  <Text className="text-sm text-gray-500">{selectedUsers.length} selected</Text>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader />
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Text className="text-gray-500">No users found matching the current search.</Text>
                  </div>
                ) : (
                  availableUsers.map((user) => {
                    const isSelected = selectedUsers.some((selected) => selected.id === user.id);
                    return (
                      <label
                        key={user.id}
                        className={`flex cursor-pointer items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 ${
                          isSelected ? "bg-[#029150]/5" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(user)}
                          className="mt-1 h-4 w-4"
                        />
                        <div>
                          <Text h3 className="block">
                            {user.firstName} {user.lastName}
                          </Text>
                          <Text className="block text-sm text-gray-500">{user.email}</Text>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {user.role && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1">
                                <Shield size={12} />
                                {user.role}
                              </span>
                            )}
                            {user.country && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1">
                                <Globe size={12} />
                                {user.country}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default EmailForm;

