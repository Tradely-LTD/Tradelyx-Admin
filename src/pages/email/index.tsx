import { useNavigate } from "react-router-dom";
import { Mail, MailCheck, MailWarning, Clock, Send, SlidersHorizontal } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import Button from "@/common/button/button";
import { appPaths } from "@/utils/app-paths";
import { useEmailStats, useEmailHistory } from "@/hooks/email";
import EmailHistoryTable from "./components/email-history-table";

const EmailLandingPage = () => {
  const navigate = useNavigate();
  const { total, sent, failed, pending, successRate, isLoading } = useEmailStats();
  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    queryParams,
    setPage,
    setLimit,
    updateFilters,
    resetHistoryFilters,
  } = useEmailHistory();

  const statsCards = [
    {
      title: "Total Emails",
      value: total,
      icon: <Send size={22} />,
      color: "#143085",
      description: "All emails sent through the platform",
    },
    {
      title: "Delivered",
      value: sent,
      icon: <MailCheck size={22} />,
      color: "#029150",
      description: "Messages delivered successfully",
    },
    {
      title: "Pending",
      value: pending,
      icon: <Clock size={22} />,
      color: "#F59E0B",
      description: "Queued or processing emails",
    },
    {
      title: "Failed",
      value: failed,
      icon: <MailWarning size={22} />,
      color: "#DC2626",
      description: "Emails that failed to send",
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: <Mail size={22} />,
      color: "#2563EB",
      description: "Delivered vs total emails",
    },
  ];

  const formatValue = (val: number | string) =>
    typeof val === "number" ? new Intl.NumberFormat().format(val) : val;

  return (
    <div className="min-h-screen space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-gray-900">Email Dashboard</h1>
          <p className="text-gray-600">
            Choose an email task below. Head into Email Mode to compose messages or review your delivery history.
          </p>
        </div>
        <Button onClick={() => navigate(appPaths.emailCompose)}>Open Email Mode</Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Email Performance</h2>
        </div>
        {isLoading ? (
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="min-w-[220px] flex-1 basis-[220px]">
                <Skeleton height={140} className="rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {statsCards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-md shadow p-5 flex flex-col gap-3 border border-gray-100 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 min-w-[220px] flex-1 basis-[220px]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <div
                    className="p-2 rounded-md"
                    style={{
                      background: `linear-gradient(135deg, ${card.color}15, ${card.color}05)`,
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </div>
                </div>
                <p className="text-3xl font-semibold text-gray-900">{formatValue(card.value)}</p>
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Email History</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={resetHistoryFilters}
              disabled={historyLoading || historyFetching}
              leftIcon={<SlidersHorizontal size={16} />}
            >
              Reset Filters
            </Button>
          </div>
        </div>
        <EmailHistoryTable
          data={historyData}
          isLoading={historyLoading}
          isFetching={historyFetching}
          currentPage={queryParams.page ?? 1}
          limit={queryParams.limit ?? 10}
          filters={queryParams}
          onPageChange={setPage}
          onLimitChange={setLimit}
          onFiltersChange={updateFilters}
        />
      </section>
    </div>
  );
};

export default EmailLandingPage;

