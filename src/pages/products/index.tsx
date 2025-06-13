//@ts-nocheck

import { useState } from "react";
import { Search, Filter, Edit2, Eye, Trash2, Box, ShieldCheck, ShieldOff } from "lucide-react";
import Pagination from "rc-pagination";
import Input from "@/common/input/input";
import Text from "@/common/text/text";
import StatusIndicator from "@/common/status";
import Modal from "@/common/modal/modal";
import ProductForm from "./components/product-form";
// import ProductPreview from "./components/product-preview";
import { Loader } from "@/common/loader/loader";
import { useDebounce } from "react-use";
import TableDropdown from "@/common/dropdown";
import {
  useGetProductsQuery,
  useDeleteProductByIdMutation,
  useGetProductStatsQuery,
} from "./product-api";
import ProductPreview from "./components/product-preview";
import Card from "@/common/cards/card";

interface Product {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail?: string | null;
  productVerified: boolean;
  createdAt: string;
}

const ProductManagement: React.FC = () => {
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Setup debounce for search
  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    },
    500,
    [searchTerm]
  );

  // Fetch products data with query params
  const { data, isLoading, isFetching } = useGetProductsQuery({
    page: currentPage,
    limit: perPage,
    search: debouncedSearchTerm,
    status: statusFilter,
  });

  const { data: recordsStats, isLoading: loadingStats } = useGetProductStatsQuery();

  // Delete product mutation
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductByIdMutation();

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Open modal for adding/editing product
  const handleEditProduct = (product?: Product) => {
    setSelectedProduct(product || null);
    setIsModalOpen(true);
  };

  // Open delete confirmation modal
  const handleOpenDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct({ id: productToDelete.id }).unwrap();
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  // Handle product preview
  const handlePreviewProduct = (product: Product) => {
    setSelectedProduct(product);
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
        <h1 className="text-2xl font-bold text-gray-800">Product Management</h1>
        <p className="text-gray-600">View and manage products</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 my-3">
        <Card
          title="Total Product"
          value={recordsStats?.totalProducts}
          icon={<Box size={24} />}
          color="#143085"
          description="All products"
          loading={isLoading}
        />
        <Card
          title="Total Verified"
          value={recordsStats?.verifiedProducts}
          icon={<ShieldCheck size={24} />}
          color="#187c53"
          description="All verified products"
          loading={isLoading}
        />
        <Card
          title="Total Unverified"
          value={recordsStats?.unverifiedProducts}
          icon={<ShieldOff size={24} />}
          color="#c38555"
          description="All unverified products"
          loading={isLoading}
        />
        <Card
          title="Recent Product"
          value={recordsStats?.recentProducts}
          icon={<Box size={24} />}
          color="#143085"
          description="Recent Product"
          loading={isLoading}
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

        <button
          onClick={() => handleEditProduct()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400"
          disabled={isDeleting}
        >
          Add Product
        </button>
      </div>

      {/* Product Table */}
      <div className="overflow-x-auto bg-white rounded-md shadow">
        {isLoading || isFetching ? (
          <Loader />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-gray-700">
                <th className="px-4 py-4 font-medium">
                  <Text>Product</Text>
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
                data.data.map((product: Product) => (
                  <tr key={product.id} className="hover:bg-gray-50 even:bg-[#F7F7F7]">
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <div className="flex items-center">
                        {product.thumbnail ? (
                          <img
                            src={product.thumbnail}
                            alt={product.title}
                            className="w-8 h-8 rounded-md mr-2 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center mr-2">
                            <Text className="text-blue-600">P</Text>
                          </div>
                        )}
                        <Text>{product.title}</Text>
                      </div>
                    </td>
                    <td className="px-4 py-4 distance-r border-[#EDEDED]">
                      <Text>{product.category}</Text>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <p className="line-clamp-2 max-w-sm text-gray-600">{product.description}</p>
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <StatusIndicator
                        status={product.produtVerified ? "verified" : "not verified"}
                      />
                    </td>
                    <td className="px-4 py-4 border-r border-[#EDEDED]">
                      <Text>{formatDate(product.createdAt)}</Text>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <TableDropdown
                          items={[
                            {
                              label: "Edit",
                              action: () => handleEditProduct(product),
                              icon: <Edit2 size={14} />,
                            },
                            {
                              label: "View",
                              action: () => handlePreviewProduct(product),
                              icon: <Eye size={14} />,
                            },
                            {
                              label: "Delete",
                              action: () => handleOpenDeleteModal(product),
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
                    <Text>No products found</Text>
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

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? "Edit Product" : "Add Product"}
        className="!max-w-4xl"
      >
        <ProductForm
          id={selectedProduct?.id}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        title="Confirm Deletion"
        className="!max-w-md"
      >
        <div className="p-4">
          <Text className="mb-4">
            Are you sure you want to delete <strong>{productToDelete?.title}</strong>? This action
            cannot be undone.
          </Text>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setProductToDelete(null);
              }}
              className="px-4 py-2 text-gray-600 rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProduct}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Product Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setPreviewIsModalOpen(false)}
        title="Preview Product Details"
        className="!max-w-[800px]"
      >
        <ProductPreview
          onClose={() => setPreviewIsModalOpen(false)}
          productId={selectedProduct?.id}
        />
      </Modal>
    </div>
  );
};

export default ProductManagement;
