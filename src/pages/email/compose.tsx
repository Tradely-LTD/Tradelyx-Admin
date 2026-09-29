import { useNavigate } from "react-router-dom";
import EmailForm from "./components/email-form";
import Button from "@/common/button/button";
import {
  useSendAllUsersEmailMutation,
  useSendBulkEmailMutation,
  useSendIndividualEmailMutation,
} from "./email-api";
import { useEmailComposer } from "@/hooks/email";
import { appPaths } from "@/utils/app-paths";

const EmailComposePage = () => {
  const navigate = useNavigate();
  const {
    mode,
    setMode,
    subject,
    setSubject,
    body,
    setBody,
    isHtml,
    setIsHtml,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    availableUsers,
    selectedUsers,
    toggleUserSelection,
    clearSelectedUsers,
    resetComposer,
    canSubmit,
    isUsersFetching,
  } = useEmailComposer();

  const [sendIndividualEmail, { isLoading: sendingIndividual }] = useSendIndividualEmailMutation();
  const [sendBulkEmail, { isLoading: sendingBulk }] = useSendBulkEmailMutation();
  const [sendAllUsersEmail, { isLoading: sendingAll }] = useSendAllUsersEmailMutation();

  const isSubmitting = sendingIndividual || sendingBulk || sendingAll;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    try {
      if (mode === "individual") {
        const recipient = selectedUsers[0];
        if (!recipient) {
          return;
        }
        await sendIndividualEmail({
          userId: recipient.id,
          subject,
          body,
          isHtml,
        }).unwrap();
      } else if (mode === "bulk") {
        if (selectedUsers.length === 0) {
          return;
        }

        await sendBulkEmail({
          userIds: selectedUsers.map((user) => user.id),
          subject,
          body,
          isHtml,
        }).unwrap();
      } else {
        await sendAllUsersEmail({
          subject,
          body,
          isHtml,
          filters: {
            role: filters.role?.trim() || undefined,
            country: filters.country?.trim() || undefined,
            isVerified: typeof filters.isVerified === "boolean" ? filters.isVerified : undefined,
          },
        }).unwrap();
      }

      resetComposer();
    } catch (error) {
      // errors surfaced via toasts
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">Write an email</h1>
          <p className="text-sm text-ink-soft">To one person, or a few you pick. Sent exactly as written.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outlined" onClick={() => navigate(appPaths.emails)}>
            Back to Direct email
          </Button>
         
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <EmailForm
          mode={mode}
          onModeChange={setMode}
          subject={subject}
          onSubjectChange={setSubject}
          body={body}
          onBodyChange={setBody}
          isHtml={isHtml}
          onIsHtmlChange={setIsHtml}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          availableUsers={availableUsers}
          selectedUsers={selectedUsers}
          toggleUserSelection={toggleUserSelection}
          clearSelectedUsers={clearSelectedUsers}
          filters={filters}
          onFiltersChange={setFilters}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          usersLoading={isUsersFetching}
        />
      </section>
    </div>
  );
};

export default EmailComposePage;

