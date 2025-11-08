import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "react-use";
import {
  EmailHistoryQueryParams,
  EmailType,
  SendAllEmailFilters,
  useGetEmailHistoryQuery,
  useGetEmailStatsQuery,
} from "@/pages/email/email-api";
import { useGetUsersQuery, User } from "@/pages/user-management/user-api";

export type EmailComposerMode = EmailType;

const DEFAULT_HISTORY_LIMIT = 10;

const sanitizeQueryParams = (params: EmailHistoryQueryParams): EmailHistoryQueryParams => {
  const sanitized: EmailHistoryQueryParams = {};

  if (params.page && params.page > 0) {
    sanitized.page = params.page;
  }

  if (params.limit && params.limit > 0) {
    sanitized.limit = params.limit;
  }

  if (params.status) {
    sanitized.status = params.status;
  }

  if (params.emailType) {
    sanitized.emailType = params.emailType;
  }

  if (params.userId) {
    sanitized.userId = params.userId;
  }

  if (params.search) {
    sanitized.search = params.search;
  }

  return sanitized;
};

export const useEmailHistory = (initialParams?: EmailHistoryQueryParams) => {
  const [queryParams, setQueryParams] = useState<EmailHistoryQueryParams>({
    page: initialParams?.page ?? 1,
    limit: initialParams?.limit ?? DEFAULT_HISTORY_LIMIT,
    status: initialParams?.status,
    emailType: initialParams?.emailType,
    userId: initialParams?.userId,
    search: initialParams?.search,
  });

  const sanitizedParams = useMemo(() => sanitizeQueryParams(queryParams), [queryParams]);

  const historyQuery = useGetEmailHistoryQuery(sanitizedParams);

  const setPage = (page: number) => {
    setQueryParams((prev) => ({
      ...prev,
      page,
    }));
  };

  const setLimit = (limit: number) => {
    setQueryParams((prev) => ({
      ...prev,
      limit,
      page: 1,
    }));
  };

  const updateFilters = (updates: Partial<EmailHistoryQueryParams>) => {
    setQueryParams((prev) => ({
      ...prev,
      ...updates,
      page: updates.page ?? prev.page ?? 1,
    }));
  };

  const resetHistoryFilters = () => {
    setQueryParams({
      page: 1,
      limit: DEFAULT_HISTORY_LIMIT,
    });
  };

  return {
    ...historyQuery,
    queryParams: sanitizedParams,
    setPage,
    setLimit,
    updateFilters,
    resetHistoryFilters,
  };
};

export type SelectedEmailUser = Pick<User, "id" | "firstName" | "lastName" | "email" | "role" | "country">;

export const useEmailComposer = () => {
  const [mode, setMode] = useState<EmailComposerMode>("individual");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isHtml, setIsHtml] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<SendAllEmailFilters>({});
  const [selectedUsers, setSelectedUsers] = useState<Record<string, SelectedEmailUser>>({});

  useDebounce(
    () => {
      setDebouncedSearch(searchTerm.trim());
    },
    400,
    [searchTerm]
  );

  const { data: usersData, isFetching: isUsersFetching } = useGetUsersQuery(
    {
      page: 1,
      limit: 10,
      search: debouncedSearch || undefined,
    },
    {
      skip: mode === "all_users",
    }
  );

  const availableUsers: SelectedEmailUser[] = useMemo(() => {
    if (!usersData?.data) {
      return [];
    }

    return usersData.data.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      country: user.country,
    }));
  }, [usersData]);

  const selectedUsersList = useMemo(() => Object.values(selectedUsers), [selectedUsers]);

  const toggleUserSelection = (user: SelectedEmailUser) => {
    setSelectedUsers((prev) => {
      const alreadySelected = Boolean(prev[user.id]);

      if (mode === "individual") {
        return alreadySelected ? {} : { [user.id]: user };
      }

      const updated = { ...prev };

      if (alreadySelected) {
        delete updated[user.id];
      } else {
        updated[user.id] = user;
      }

      return updated;
    });
  };

  const clearSelectedUsers = () => {
    setSelectedUsers({});
  };

  const resetComposer = () => {
    setSubject("");
    setBody("");
    setIsHtml(true);
    setSearchTerm("");
    setFilters({});
    setSelectedUsers({});
  };

  useEffect(() => {
    if (mode === "all_users") {
      setSelectedUsers({});
    }
  }, [mode]);

  const canSubmit = useMemo(() => {
    if (!subject.trim() || !body.trim()) {
      return false;
    }

    if (mode === "all_users") {
      return true;
    }

    return selectedUsersList.length > 0;
  }, [body, mode, selectedUsersList.length, subject]);

  return {
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
    selectedUsers: selectedUsersList,
    toggleUserSelection,
    clearSelectedUsers,
    resetComposer,
    canSubmit,
    isUsersFetching,
  };
};

export const useEmailStats = () => {
  const { data, isLoading, isFetching, refetch } = useGetEmailStatsQuery();

  const totals = data?.totals ?? { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 };
  const byType = data?.byType ?? [];
  const last7Days = data?.last7Days ?? [];
  const successRate = totals.total > 0 ? Math.round((totals.successRate ?? 0) * 100) : 0;

  return {
    total: totals.total,
    sent: totals.sent,
    failed: totals.failed,
    pending: totals.pending,
    successRate,
    byType,
    last7Days,
    isLoading,
    isFetching,
    refetch,
  };
};

