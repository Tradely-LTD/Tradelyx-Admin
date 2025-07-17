//@ts-nocheck
import { useState } from "react";
import { Search, Filter, Eye, Box, ShieldCheck, ShieldOff } from "lucide-react";
import Pagination from "rc-pagination";
import Input from "@/common/input/input";
import Text from "@/common/text/text";
import StatusIndicator from "@/common/status";
import Modal from "@/common/modal/modal";
import { Loader } from "@/common/loader/loader";
import { useDebounce } from "react-use";
import { useGetReferralStatsQuery, useGetReferralsQuery } from "./referral-api";
import Card from "@/common/cards/card";
import ReferralPreview from "./components/referral-preview";

interface ReferredUser {
  id: string;
  referalCode: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

const ReferralManagement: React.FC = () => {
  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [isPreviewModalOpen, setPreviewIsModalOpen] = useState<boolean>(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferredUser | null>(null);

  // Setup debounce for search
  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    },
    500,
    [searchTerm]
  );

  const { data: referralStats, isLoading: isLoadingStats } = useGetReferralStatsQuery();
  const { data, isLoading, isFetching } = useGetReferralsQuery({
    page: currentPage,
    limit: perPage,
    search: debouncedSearchTerm,
    status: statusFilter,
  });

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle referral preview
  const handlePreviewReferral = (referral: ReferredUser) => {
    setSelectedReferral(referral);
    setPreviewIsModalOpen(true);
  };

  // Format date function
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="min-h-screen py-5">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Referral Management</h1>
        <p className="text-gray-600">View and manage referrals</p>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-3">
        <Card
          title="Your Referral Code"
          value={referralStats?.data?.referalCode || "N/A"}
          icon={<Box size={24} />}
          color="#143085"
          description="Your unique referral code"
          loading={isLoadingStats}
        />
        <Card
          title="Total Referrals"
          value={referralStats?.data?.totalReferredUser}
          icon={<ShieldCheck size={24} />}
          color="#187c53"
          description="Total referred users"
          loading={isLoadingStats}
        />
        <Card
          title="Verified Referrals"
          value={referralStats?.data?.verifiedReferrals}
          icon={<ShieldOff size={24} />}
          color="#c38555"
          description="Verified referred users"
          loading={isLoadingStats}
        />
        <Card
          title="Pending Sellers"
          value={referralStats?.data?.sellersWithoutKyc}
          icon={<ShieldOff size={24} />}
          color="#c38555"
          description="Sellers without KYC verification"
          loading={isLoadingStats}
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
        <div className="flex items-center gap-3">
          <div>
            <Input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div>
            <Input
              type="select"
              placeholder="Filter by Status"
              options={[
                { label: "All", value: "" },
                { label: "Verified", value: "verified" },
                { label: "Not Verified", value: "unverified" },
              ]}
              onSelectChange={(e) => {
                setStatusFilter(e.value);
                setCurrentPage(1);
              }}
              leftIcon={<Filter className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* Referral Table */}
      <div className="overflow-x-auto bg-white rounded-md shadow">
        {isLoading || isFetching ? (
          <Loader />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-gray-700">
                <th className="px-4 py-4 font-medium">
                  <Text>Name</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Email</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Referral Code</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Status</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Created On</Text>
                </th>
                {/* <th className="px-4 py-4 font-medium">
                  <Text>Actions</Text>
                </th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data && data?.data?.length > 0 ? (
                data?.data?.map((referral: ReferredUser) => (
                  <tr key={referral.id} className="hover:bg-gray-50 even:bg-[#F7F7F7]">
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{`${referral.firstName} ${referral.lastName}`}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{referral.email}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{referral.referalCode}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={referral.isVerified ? "verified" : "not verified"} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{formatDate(referral.createdAt)}</Text>
                    </td>
                    {/* <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <TableDropdown
                          items={[
                            {
                              label: "View",
                              action: () => handlePreviewReferral(referral),
                              icon: <Eye size={14} />,
                            },
                          ]}
                        />
                      </div>
                    </td> */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center">
                    <Text>No referrals found</Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
          <Pagination
            current={currentPage}
            total={Number(data?.pagination?.total) || 0}
            pageSize={perPage}
            onChange={handlePageChange}
            className="flex gap-2"
          />
        </div>
      </div>

      {/* Referral Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setPreviewIsModalOpen(false)}
        title="Preview Referral Details"
        className="!max-w-[800px]"
      >
        <ReferralPreview
          onClose={() => setPreviewIsModalOpen(false)}
          referralId={selectedReferral?.id}
        />
      </Modal>
    </div>
  );
};

export default ReferralManagement;
