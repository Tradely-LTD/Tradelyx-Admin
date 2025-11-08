import { useMemo, useState } from "react";
import Pagination from "rc-pagination";
import Button from "@/common/button/button";
import EmptyState from "@/common/empty-state";
import Input, { SelectOption } from "@/common/input/input";
import { Loader } from "@/common/loader/loader";
import Text from "@/common/text/text";
import Modal from "@/common/modal/modal";
import { EmailHistoryResponse, EmailHistoryQueryParams, EmailLog, EmailType } from "@/pages/email/email-api";
import StatusIndicator, { StatusType } from "@/common/status";
import type { MultiValue, SingleValue } from "react-select";

interface EmailHistoryTableProps {
  data?: EmailHistoryResponse;
  isLoading?: boolean;
  isFetching?: boolean;
  currentPage: number;
  limit: number;
  filters: EmailHistoryQueryParams;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onFiltersChange: (filters: Partial<EmailHistoryQueryParams>) => void;
  onRefresh?: () => void;
}

const statusOptions: SelectOption[] = [
  { label: "Any status", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
];

const typeOptions: SelectOption[] = [
  { label: "Any type", value: "" },
  { label: "Individual", value: "individual" },
  { label: "Bulk", value: "bulk" },
  { label: "All users", value: "all_users" },
];

const limitOptions: SelectOption[] = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
];

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const EmailHistoryTable = ({
  data,
  isLoading,
  isFetching,
  currentPage,
  limit,
  filters,
  onPageChange,
  onLimitChange,
  onFiltersChange,
  onRefresh,
}: EmailHistoryTableProps) => {
  const emailLogs = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const getBodyPreview = useMemo(() => {
    return (body: string) => {
      const text = body.replace(/<[^>]+>/g, "").trim();
      return text.length > 40 ? `${text.slice(0, 40)}…` : text;
    };
  }, []);

  const mapStatusToIndicator = (status: EmailLog["status"]): StatusType =>
    status === "sent" ? "sent" : status === "failed" ? "failed" : "pending";

  const mapTypeToIndicator = (type: EmailType): StatusType => {
    if (type === "bulk") {
      return "bulk";
    }
    if (type === "all_users") {
      return "all_users";
    }
    return "individual";
  };

  const isHtmlContent = (body: string) => /<\/?[a-z][\s\S]*>/i.test(body);

  const isMultiValue = (value: unknown): value is MultiValue<SelectOption> => Array.isArray(value);

  const extractValue = (
    option: SingleValue<SelectOption> | MultiValue<SelectOption> | null
  ): string | number | undefined => {
    if (!option) {
      return undefined;
    }
    if (isMultiValue(option)) {
      return option.length ? option[0]?.value : undefined;
    }
    return option.value;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Input
            type="text"
            placeholder="Search by subject, email or recipient"
            value={filters.search ?? ""}
            onChange={(event) => onFiltersChange({ search: event.target.value, page: 1 })}
            fullWidth
          />
          <Input
            type="select"
            value={statusOptions.find((option) => option.value === (filters.status ?? ""))}
            onSelectChange={(option) =>
              onFiltersChange({
                status: (extractValue(option) as EmailHistoryQueryParams["status"]) || undefined,
                page: 1,
              })
            }
            options={statusOptions}
            classNameWrapper="w-full"
          />
          <Input
            type="select"
            value={typeOptions.find((option) => option.value === (filters.emailType ?? ""))}
            onSelectChange={(option) =>
              onFiltersChange({ emailType: (extractValue(option) as EmailType) || undefined, page: 1 })
            }
            options={typeOptions}
            classNameWrapper="w-full"
          />
        </div>
        {onRefresh && (
          <Button variant="outlined" onClick={onRefresh} disabled={isFetching || isLoading}>
            Refresh
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm font-medium text-gray-600">
                <th className="px-4 py-3">
                  <Text>Subject</Text>
                </th>
                <th className="px-4 py-3">
                  <Text>Recipient</Text>
                </th>
                <th className="px-4 py-3">
                  <Text>Type</Text>
                </th>
                <th className="px-4 py-3">
                  <Text>Status</Text>
                </th>
                <th className="px-4 py-3">
                  <Text>Sent at</Text>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading || isFetching ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <div className="flex items-center justify-center">
                      <Loader />
                    </div>
                  </td>
                </tr>
              ) : emailLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <EmptyState description="No email history records yet." />
                  </td>
                </tr>
              ) : (
                emailLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 align-top min-w-[200px]">
                      <Text className="font-medium text-gray-900">{log.subject}</Text>
                    </td>
                    <td className="px-4 py-3">
                      <Text className="block text-gray-900">{log.recipientEmail || "Multiple recipients"}</Text>
                      {log.recipientName && <Text className="block text-xs text-gray-500">{log.recipientName}</Text>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusIndicator status={mapTypeToIndicator(log.emailType)} pale />
                    </td>
                    <td className="px-4 py-3">
                      <StatusIndicator status={mapStatusToIndicator(log.status)} pale />
                    </td>
                    <td className="px-4 py-3">
                      <Text className="block">{formatDateTime(log.sentAt ?? log.createdAt)}</Text>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {emailLogs.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Input
                type="select"
                value={limitOptions.find((option) => Number(option.value) === limit)}
                onSelectChange={(option) => onLimitChange(Number(extractValue(option) ?? 10))}
                options={limitOptions}
                label="Rows per page"
                classNameWrapper="w-40"
              />
            </div>
            <div className="flex flex-col gap-2 items-start md:items-end">
              <Text className="text-sm text-gray-500 md:text-right">
                Showing {(currentPage - 1) * limit + 1}-
                {Math.min(currentPage * limit, total)} of {total} records
              </Text>
              <Pagination current={currentPage} total={total} pageSize={limit} onChange={onPageChange} />
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.subject ?? "Email details"}
        className="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Recipient: </Text>
                <Text className="text-base font-medium text-gray-900">
                  {selectedLog.recipientEmail || "Multiple recipients"}
                </Text>
                {selectedLog.recipientName && (
                  <Text className="text-sm text-gray-500">{selectedLog.recipientName}</Text>
                )}
              </div>
              <StatusIndicator status={mapStatusToIndicator(selectedLog.status)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Email type: </Text>
                <StatusIndicator status={mapTypeToIndicator(selectedLog.emailType)} />
              </div>
              <div className="space-y-1">
                <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Sent at: </Text>
                <Text className="text-sm text-gray-800">
                  {formatDateTime(selectedLog.sentAt ?? selectedLog.createdAt)}
                </Text>
              </div>
              {selectedLog.errorMessage && (
                <div className="space-y-1 sm:col-span-2">
                  <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Error message
                  </Text>
                  <Text className="text-sm text-red-600">{selectedLog.errorMessage}</Text>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Message</Text>
              <div className="max-h-[420px] overflow-auto rounded-lg border border-gray-200 bg-white p-4">
                {isHtmlContent(selectedLog.body) ? (
                  <div
                    className="prose max-w-none text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-700">
                    {selectedLog.body}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmailHistoryTable;

