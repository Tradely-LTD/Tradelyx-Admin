//@ts-nocheck
import { useState } from "react";
import { Search, User, Filter, Edit2, Eye, HandHelping } from "lucide-react";
import Pagination from "rc-pagination";
import Input from "@/common/input/input";
import Text from "@/common/text/text";
import StatusIndicator from "@/common/status";
import { useGetUsersQuery } from "./user-api";
import Modal from "@/common/modal/modal";
import UserForm from "./components/user-form";
import { Loader } from "@/common/loader/loader";
import { useDebounce } from "react-use";
import TableDropdown from "@/common/dropdown";
import SellerPreview from "./components/seller-preview";
import SellerProfileForm from "./components/seller-form";
import UserPreview from "./components/user-preview";

const UserManagement = () => {
  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, _] = useState(10);
  const [userRole, setUserRole] = useState("");
  const [userStatus, setUserStatus] = useState("");

  // State for debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setPreviewIsModalOpen] = useState(false);
  const [isUserPreviewModalOpen, setUserPreviewIsModalOpen] = useState(false);
  const [isOnboradModalOpen, setIsOnboardIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Setup debounce for search
  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    },
    500,
    [searchTerm]
  );

  // Fetch users data with query params
  const { data, isLoading, isFetching } = useGetUsersQuery({
    page: currentPage,
    limit: perPage,
    search: debouncedSearchTerm,
    status: userStatus,
    role: userRole,
  });

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Open modal with user data
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handlePreview = (user) => {
    setSelectedUser(user);
    if (user.role === "seller") {
      setPreviewIsModalOpen(true);
    } else {
      setUserPreviewIsModalOpen(true);
    }
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

  // Safe data access with proper null checking
  const users = data?.data || [];
  const pagination = data?.pagination || { total: 0 };

  return (
    <div className="min-h-screen py-5">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-600">View and manage user accounts</p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="">
            <Input
              type="text"
              placeholder="Search by name, email or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="">
            <Input
              type="select"
              placeholder="Filter by Role"
              // value={userRole}
              options={[
                { label: "All Roles", value: "" },
                { label: "Admin", value: "unassigned" },
                { label: "Seller", value: "seller" },
                { label: "Buyer", value: "buyer" },
              ]}
              onSelectChange={(e) => {
                setUserRole(e.value);
                setCurrentPage(1);
              }}
              leftIcon={<Filter className="w-4 h-4" />}
            />
          </div>

          <div className="">
            <Input
              type="select"
              placeholder="Filter by Status"
              // value={userStatus}
              options={[
                { label: "All Status", value: "" },
                { label: "Verified", value: "true" },
                { label: "Not Verified", value: "false" },
              ]}
              onSelectChange={(e) => {
                setUserStatus(e.value);
                setCurrentPage(1);
              }}
              leftIcon={<Filter className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* User Table */}
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
                  <Text>Phone</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Company</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Country</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>KYC Status</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Company</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Role</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Status Verified</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Registered On</Text>
                </th>
                <th className="px-4 py-4 font-medium">
                  <Text>Actions</Text>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users?.length > 0 ? (
                users?.map((user) => (
                  <tr key={user?.id} className="hover:bg-gray-50 even:bg-[#F7F7F7]">
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <div className="flex items-center">
                        {user?.profileImage ? (
                          <img
                            src={user?.profileImage}
                            alt={`${user?.firstName} ${user?.lastName}`}
                            className="w-8 h-8 rounded-full mr-2 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                            <User className="w-4 h-4 text-blue-500" />
                          </div>
                        )}
                        <div>
                          <Text>
                            {user?.firstName} {user?.lastName}
                          </Text>
                          <Text className="text-sm text-gray-500">{user?.email}</Text>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{user?.email}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{user?.phone}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user?.isCompany} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{user?.country}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user?.isKYCCompleted} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user?.isCompany} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user?.role == null ? "unassigned" : user?.role} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user?.status} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{formatDate(user?.createdAt)}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <TableDropdown
                        items={[
                          {
                            label: "Edit User",
                            icon: <Edit2 size={16} />,
                            action: () => handleEditUser(user),
                          },
                          {
                            label: "View Details",
                            icon: <Eye size={16} />,
                            action: () => handlePreview(user),
                          },
                          ...(user.role === "seller"
                            ? [
                                {
                                  label: "Onboard as Seller",
                                  icon: <HandHelping size={16} />,
                                  action: () => {
                                    setSelectedUser(user);
                                    setIsOnboardIsModalOpen(true);
                                  },
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-4 text-center">
                    <Text>No users found</Text>
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
            total={Number(pagination?.total || 0)}
            pageSize={perPage}
            onChange={handlePageChange}
            className="flex gap-2"
          />
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit User Information"
      >
        <UserForm
          id={selectedUser?.id}
          onClose={() => {
            setIsModalOpen(false);
          }}
        />
      </Modal>

      {/* seller data preview  */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setPreviewIsModalOpen(false)}
        title="Seller Profile"
        className="!max-w-[800px]"
      >
        <SellerPreview sellerId={selectedUser?.id} onClose={() => setPreviewIsModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isUserPreviewModalOpen}
        onClose={() => setUserPreviewIsModalOpen(false)}
        title="User Profile"
        className="!max-w-[800px]"
      >
        <UserPreview userId={selectedUser?.id} onClose={() => setUserPreviewIsModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isOnboradModalOpen}
        onClose={() => setIsOnboardIsModalOpen(false)}
        title="Onboard Seller"
        className="!max-w-[800px]"
      >
        <SellerProfileForm onClose={() => setIsOnboardIsModalOpen(false)} id={selectedUser?.id} />
      </Modal>
    </div>
  );
};

export default UserManagement;
