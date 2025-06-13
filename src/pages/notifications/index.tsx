//@ts-nocheck
import { useState } from "react";
import { Search, Filter, Edit2, Eye } from "lucide-react";
import Pagination from "rc-pagination";
import Input from "@/common/input/input";
import Text from "@/common/text/text";
import { Loader } from "@/common/loader/loader";
import { useDebounce } from "react-use";
import TableDropdown from "@/common/dropdown";
import Modal from "@/common/modal/modal";
import { useGetNotificationsQuery } from "./notification-api";
import NotificationForm from "./components/notification-form";
import Button from "@/common/button/button";
import EmptyState from "@/common/empty-state";

const NotificationManagement = () => {
  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [userIdFilter, setUserIdFilter] = useState("");

  // State for debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setPreviewIsModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Setup debounce for search
  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
      setPerPage(1); // Reset to first page on new search
    },
    500,
    [searchTerm]
  );

  // Fetch notifications data with query params
  const { data, isLoading, isFetching } = useGetNotificationsQuery();

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Open modal with notification data
  const handleEditNotification = (notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  // Format date function
  const formatDate = (dateString) => {
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
        <h1 className="text-2xl font-bold text-gray-800">Notification Management</h1>
        <p className="text-gray-600">View and manage notifications</p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
        <div className="flex items-center gap-3">
          <div>
            <Input
              type="text"
              placeholder="Search by title or message"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div>
            <Input
              type="text"
              placeholder="Filter by User ID"
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Filter className="w-4 h-4" />}
            />
          </div>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          //   disabled={isDeleting}
        >
          Add Notification
        </Button>
      </div>

      {/* Notification Table */}
      {isLoading || isFetching ? (
        <Loader />
      ) : data && data?.data?.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-md shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-gray-700">
                <th className="px-4 py-4 font-medium">
                  <Text>Title</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Message</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>User ID</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Thumbnail</Text>
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
              {data?.data?.map((notification) => (
                <tr key={notification.id} className="hover:bg-gray-50 even:bg-[#F7F7F7]">
                  <td className="px-4 py-4 border-r border-[#EDEDED]">
                    <Text>{notification.title}</Text>
                  </td>
                  <td className="px-4 py-4 border-r border-[#EDEDED]">
                    <Text className="truncate max-w-xs">{notification.message}</Text>
                  </td>
                  <td className="px-4 py-4 border-r border-[#EDEDED]">
                    <Text>{notification.userId}</Text>
                  </td>
                  <td className="px-4 py-4 border-r border-[#EDEDED]">
                    {notification.thumbnail ? (
                      <img
                        src={notification.thumbnail}
                        alt={notification.title}
                        className="w-8 h-8 rounded-md object-cover"
                      />
                    ) : (
                      <Text>No Thumbnail</Text>
                    )}
                  </td>
                  <td className="px-4 py-4 border-r border-[#EDEDED]">
                    <Text>{formatDate(notification.createdAt)}</Text>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex space-x-2">
                      <TableDropdown
                        items={[
                          {
                            label: "Edit",
                            action: () => handleEditNotification(notification),
                            icon: <Edit2 size={14} />,
                          },
                          {
                            label: "View",
                            action: () => {
                              setPreviewIsModalOpen(true);
                              setSelectedNotification(notification);
                            },
                            icon: <Eye size={14} />,
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
            <Pagination
              current={currentPage}
              total={Number(data?.pagination?.total)}
              pageSize={perPage}
              onChange={handlePageChange}
              className="flex gap-2"
            />
          </div>
        </div>
      ) : (
        <EmptyState description="No notifications found" />
      )}

      {/* Edit Notification Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Notification">
        <NotificationForm
          id={selectedNotification?.id}
          onClose={() => {
            setIsModalOpen(false);
          }}
        />
      </Modal>

      {/* Notification Preview Modal */}
      {/* <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setPreviewIsModalOpen(false)}
        title="Notification Preview"
        className="!max-w-[800px]"
      >
        <NotificationPreview
          onClose={() => setPreviewIsModalOpen(false)}
          notificationId={selectedNotification?.id}
        />
      </Modal> */}
    </div>
  );
};

export default NotificationManagement;
