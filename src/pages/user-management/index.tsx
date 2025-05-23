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

const UserManagement = () => {
  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [userRole, setUserRole] = useState("");
  const [userStatus, setUserStatus] = useState("");

  // State for debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setPreviewIsModalOpen] = useState(false);
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

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Custom pagination item renderer

  // Extracting pagination details
  // const paginationData = data?.data.pagination || {
  //   total: 0,
  //   currentPage: 1,
  //   totalPages: 1,
  //   hasMore: false,
  // };

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
                // { label: "Admin", value: "admin" },
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
              {data && data.data.length > 0 ? (
                data.data.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 even:bg-[#F7F7F7]">
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <div className="flex items-center">
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-8 h-8 rounded-full mr-2 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                        <Text>{`${user.firstName} ${user.lastName}`}</Text>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{user.email}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{user.phone}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user.isCompany ? "company" : "individual"} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">{user.country}</td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user.isKYCCompleted ? "completed" : "pending"} />
                    </td>

                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user.companyVerified ? "verified" : "not verify"} />
                    </td>

                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user?.role == null ? "null" : user.role} />
                    </td>

                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator status={user.status ? "verified" : "not verify"} />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{formatDate(user.createdAt)}</Text>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <TableDropdown
                          items={[
                            {
                              label: "Edit",
                              action: () => handleEditUser(user),
                              icon: <Edit2 size={14} />,
                            },
                            {
                              label: "View",
                              action: () => {
                                setPreviewIsModalOpen(true);
                                setSelectedUser(user);
                              },
                              icon: <Eye size={14} />,
                            },
                            ...(user.role === "seller"
                              ? [
                                  {
                                    label: "Onboard Seller",
                                    action: () => {
                                      setIsOnboardIsModalOpen(true);
                                      setSelectedUser(user);
                                    },
                                    icon: <HandHelping size={14} />,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center">
                    <Text>No users found</Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {/* {data?.data?.pagination?.total > 0 && ( */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
          <Pagination
            current={currentPage}
            total={Number(data?.pagination?.total)}
            pageSize={perPage}
            onChange={handlePageChange}
            // itemRender={itemRender}
            className="flex gap-2"
          />
        </div>
        {/* )} */}
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
        title="Preview Seller Information"
        className="!max-w-[800px]"
      >
        <SellerPreview onClose={() => setPreviewIsModalOpen(false)} sellerId={selectedUser?.id} />
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
