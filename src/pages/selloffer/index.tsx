//@ts-nocheck
import { useState } from "react";
import { Search, Filter, Edit2, Eye, Trash2, Box, ShieldCheck, ShieldOff } from "lucide-react";
import Pagination from "rc-pagination";
import Input from "@/common/input/input";
import Text from "@/common/text/text";
import StatusIndicator from "@/common/status";
import Modal from "@/common/modal/modal";
import { Loader } from "@/common/loader/loader";
import { useDebounce } from "react-use";
import TableDropdown from "@/common/dropdown";
import {
  useGetSellOffersQuery,
  useDeleteSellOfferByIdMutation,
  useGetSellOfferStatsQuery,
} from "./sell-offer-api";
import Card from "@/common/cards/card";
import SellOfferForm from "./sell-offer-form";
import SellOfferPreview from "./sellOffer-preview";
import { formatDate } from "@/utils/helper";

interface SellOffer {
  id: string;
  title: string;
  productCategory: string;
  detailedDescription: string;
  thumbnail?: string | null;
  isActive: boolean;
  status: boolean;
  createdAt: string;
}

const SellOfferManagement: React.FC = () => {
  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // State for debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setPreviewIsModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedOffer, setSelectedOffer] = useState<SellOffer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<SellOffer | null>(null);

  // Setup debounce for search
  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    },
    500,
    [searchTerm]
  );

  // Fetch sell offers data with query params
  const { data, isLoading, isFetching } = useGetSellOffersQuery({
    page: currentPage,
    limit: perPage,
    search: debouncedSearchTerm,
    status: statusFilter,
  });

  const { data: offersStatsRecord, isLoading: loadingStats } = useGetSellOfferStatsQuery();
  const recordsStats = offersStatsRecord?.data;
  // Delete sell offer mutation
  const [deleteSellOffer, { isLoading: isDeleting }] = useDeleteSellOfferByIdMutation();

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Open modal for adding/editing sell offer
  const handleEditOffer = (offer?: SellOffer) => {
    setSelectedOffer(offer || null);
    setIsModalOpen(true);
  };

  // Open delete confirmation modal
  const handleOpenDeleteModal = (offer: SellOffer) => {
    setOfferToDelete(offer);
    setIsDeleteModalOpen(true);
  };

  // Handle sell offer deletion
  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      await deleteSellOffer({ id: offerToDelete.id }).unwrap();
      setIsDeleteModalOpen(false);
      setOfferToDelete(null);
    } catch (error) {
      console.error("Failed to delete sell offer:", error);
    }
  };

  // Handle sell offer preview
  const handlePreviewOffer = (offer: SellOffer) => {
    setSelectedOffer(offer);
    setPreviewIsModalOpen(true);
  };

  return (
    <div className="min-h-screen py-5">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sell Offer Management</h1>
        <p className="text-gray-600">View and manage sell offers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 my-3">
        <Card
          title="Total Offers"
          value={recordsStats?.totalOffers}
          icon={<Box size={24} />}
          color="#143085"
          description="All sell offers"
          loading={loadingStats}
        />
        <Card
          title="Active Offers"
          value={recordsStats?.activeOffers}
          icon={<ShieldCheck size={24} />}
          color="#187c53"
          description="All active offers"
          loading={loadingStats}
        />
        <Card
          title="Inactive Offers"
          value={recordsStats?.inactiveOffers}
          icon={<ShieldOff size={24} />}
          color="#c38555"
          description="All inactive offers"
          loading={loadingStats}
        />
        <Card
          title="Recent Offers"
          value={recordsStats?.recentOffers}
          icon={<Box size={24} />}
          color="#143085"
          description="Recent sell offers"
          loading={loadingStats}
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
        <div className="flex items-center gap-3">
          <div>
            <Input
              type="text"
              placeholder="Search by title or category"
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
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
              onSelectChange={(e) => {
                setStatusFilter(e.value);
                setCurrentPage(1);
              }}
              leftIcon={<Filter className="w-4 h-4" />}
            />
          </div>
        </div>

        <button
          onClick={() => handleEditOffer()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400"
          disabled={isDeleting}
        >
          Add Sell Offer
        </button>
      </div>

      {/* Sell Offer Table */}
      <div className="overflow-x-auto bg-white rounded-md shadow">
        {isLoading || isFetching ? (
          <Loader />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-gray-700">
                <th className="px-4 py-4 font-medium">
                  <Text>Offer</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Category</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Description</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Status</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Created On</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Actions</Text>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data && data.data.length > 0 ? (
                data.data.map((offer: SellOffer) => (
                  <tr key={offer.id} className="hover:bg-gray-50 even:bg-[#F7F7F7]">
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <div className="flex items-center">
                        {offer.thumbnail ? (
                          <img
                            src={offer.thumbnail}
                            alt={offer.title}
                            className="w-8 h-8 rounded-md mr-2 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center mr-2">
                            <Text className="text-blue-600">O</Text>
                          </div>
                        )}
                        <Text>{offer.title}</Text>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{offer.productCategory}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <p className="line-clamp-2 max-w-sm text-gray-600">
                        {offer.detailedDescription}
                      </p>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={offer.isActive ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{formatDate(offer.createdAt)}</Text>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <TableDropdown
                          items={[
                            {
                              label: "Edit",
                              action: () => handleEditOffer(offer),
                              icon: <Edit2 size={14} />,
                            },
                            {
                              label: "View",
                              action: () => handlePreviewOffer(offer),
                              icon: <Eye size={14} />,
                            },
                            {
                              label: "Delete",
                              action: () => handleOpenDeleteModal(offer),
                              icon: <Trash2 size={14} />,
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center">
                    <Text>No sell offers found</Text>
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
            total={Number(data?.pagination.total) || 0}
            pageSize={perPage}
            onChange={handlePageChange}
            className="flex gap-2"
          />
        </div>
      </div>

      {/* Add/Edit Sell Offer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOffer ? "Edit Sell Offer" : "Add Sell Offer"}
        className="!max-w-4xl"
      >
        <SellOfferForm
          id={selectedOffer?.id}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOffer(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setOfferToDelete(null);
        }}
        title="Confirm Deletion"
        className="!max-w-md"
      >
        <div className="p-4">
          <Text className="mb-4">
            Are you sure you want to delete <strong>{offerToDelete?.title}</strong>? This action
            cannot be undone.
          </Text>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setOfferToDelete(null);
              }}
              className="px-4 py-2 text-gray-600 rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteOffer}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Sell Offer Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setPreviewIsModalOpen(false)}
        title="Preview Sell Offer Details"
        className="!max-w-[800px]"
      >
        <SellOfferPreview
          onClose={() => setPreviewIsModalOpen(false)}
          offerId={selectedOffer?.id ?? ""}
        />
      </Modal>
    </div>
  );
};

export default SellOfferManagement;
