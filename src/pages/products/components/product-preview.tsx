//@ts-nocheck
import { useState } from "react";
import { X, CheckCircle, Loader, FileText, Download, Eye } from "lucide-react";
import Button from "@/common/button/button";
import { useGetProductQuery, useUpdateProductMutation } from "../product-api";
import { useUserSlice } from "@/pages/auth/authSlice";

const ProductPreview = ({ productId, onClose }) => {
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [updateProduct, { isLoading: updatingProduct }] = useUpdateProductMutation();
  const { data, isLoading } = useGetProductQuery({ id: productId });

  const { loginResponse } = useUserSlice();
  const userRole = loginResponse?.user.roles;
  const product = data?.data;

  const handleVerifyToggle = async (verifyStatus) => {
    try {
      await updateProduct({
        id: productId,
        data: { ...product, produtVerified: verifyStatus },
      })
        .unwrap()
        .then(() => {
          onClose();
        });
    } catch (error) {
      console.error(`Failed to ${verifyStatus ? "verify" : "unverify"} product:`, error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getFileType = (url) => {
    if (!url) return "unknown";
    const extension = url.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    } else {
      return "other";
    }
  };

  const openDocumentPreview = (docUrl) => {
    setDocumentLoading(true);
    setActiveDocument(docUrl);
    setTimeout(() => setDocumentLoading(false), 1000);
  };

  const closeDocumentPreview = () => {
    setActiveDocument(null);
  };

  const renderDocumentLinks = (documents) => {
    if (!documents || documents.length === 0)
      return <span className="text-gray-400">No documents uploaded</span>;

    return (
      <div className="flex flex-wrap gap-2">
        {documents.map((doc, index) => {
          const fileType = getFileType(doc);
          const fileName = doc.split("/").pop();

          let Icon = FileText;
          let bgColor = "bg-blue-50";
          let textColor = "text-blue-600";

          if (fileType === "image") {
            Icon = () => (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            );
            bgColor = "bg-green-50";
            textColor = "text-green-600";
          } else if (fileType === "pdf") {
            Icon = () => (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
                <line x1="9" y1="11" x2="15" y2="11" />
                <line x1="9" y1="19" x2="10" y2="19" />
              </svg>
            );
            bgColor = "bg-red-50";
            textColor = "text-red-600";
          }

          return (
            <button
              key={index}
              className={`flex items-center px-3 py-1 ${bgColor} ${textColor} rounded-md hover:opacity-80 transition-colors text-xs md:text-sm`}
              title={fileName}
              onClick={() => openDocumentPreview(doc)}
            >
              <Icon size={14} className="mr-1" />
              <span className="truncate max-w-28">
                {fileName.length > 15 ? fileName.substring(0, 12) + "..." : fileName}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const DocumentPreview = () => {
    if (!activeDocument) return null;

    const fileType = getFileType(activeDocument);
    const fileName = activeDocument.split("/").pop();
    const [previewError, setPreviewError] = useState(false);

    const renderDocumentContent = () => {
      switch (fileType) {
        case "image":
          return (
            <div className="flex flex-col items-center justify-center">
              <img
                src={activeDocument}
                alt="Document preview"
                className="max-w-full max-h-screen object-contain border shadow-sm rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/api/placeholder/300/400";
                  e.target.className += " border-red-300";
                  setPreviewError(true);
                }}
              />
              {previewError && (
                <div className="mt-2 text-red-600 text-sm">
                  Could not load this image. It may be due to browser security restrictions.
                </div>
              )}
              <p className="mt-3 text-gray-700">{fileName}</p>
            </div>
          );

        case "pdf":
          return (
            <div className="flex flex-col items-center w-full h-full">
              <div className="bg-gray-50 border rounded-lg p-6 flex flex-col items-center justify-center w-full">
                <div className="bg-red-50 p-8 rounded-full mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-500"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                    <line x1="9" y1="19" x2="10" y2="19" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">{fileName}</p>
                <p className="text-sm text-gray-500 mt-2 mb-6 text-center max-w-lg">
                  PDF documents cannot be previewed directly in this interface.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  <a
                    href={activeDocument}
                    download={fileName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(activeDocument, "_blank");
                    }}
                  >
                    <Download size={16} className="mr-2" />
                    Download PDF
                  </a>
                  <a
                    href={activeDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-600 text-white rounded-md flex items-center hover:bg-gray-700 transition-colors"
                  >
                    <Eye size={16} className="mr-2" />
                    View in Browser
                  </a>
                </div>
              </div>
            </div>
          );

        default:
          return (
            <div className="bg-gray-50 border rounded-lg p-6 flex flex-col items-center justify-center">
              <div className="bg-gray-100 p-8 rounded-full mb-4">
                <FileText size={48} className="text-gray-500" />
              </div>
              <p className="text-gray-700 font-medium">{fileName}</p>
              <p className="text-sm text-gray-500 mt-2 mb-6 text-center max-w-lg">
                This document format cannot be previewed directly.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                <a
                  href={activeDocument}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(activeDocument, "_blank");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
                >
                  <Download size={16} className="mr-2" />
                  Download File
                </a>
                <a
                  href={activeDocument}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-600 text-white rounded-md flex items-center hover:bg-gray-700 transition-colors"
                >
                  <Eye size={16} className="mr-2" />
                  Open in Browser
                </a>
              </div>
            </div>
          );
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <h3 className="font-medium">Document Preview</h3>
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">
                {fileType}
              </span>
            </div>
            <button
              onClick={closeDocumentPreview}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {documentLoading ? (
              <div className="flex flex-col items-center justify-center h-96">
                <Loader size={40} className="text-blue-500 animate-spin" />
                <p className="mt-4 text-gray-600">Loading document...</p>
              </div>
            ) : (
              <div className="min-h-96">{renderDocumentContent()}</div>
            )}
          </div>

          <div className="border-t p-3 flex justify-end">
            <button
              onClick={closeDocumentPreview}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96">
        <Loader size={40} className="text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-600">Loading product information...</p>
      </div>
    );
  }

  return (
    <div className="max-h-screen overflow-auto">
      <div className="p-6 space-y-6">
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          {product?.thumbnail ? (
            <img
              src={product.thumbnail}
              alt="Product Thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No thumbnail image
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md">
            <h2 className="text-lg font-semibold">{product?.title || "N/A"}</h2>
            <p className="text-sm text-gray-600">{product?.category?.label || "N/A"}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Product Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-sm">{product?.description || "No description provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tags</p>
                {product?.tags?.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No tags</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Certifications</p>
                <p>{product?.certifications || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Specification</p>
                <p>{product?.specification || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Supply Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Supply Capacity</p>
                <p>
                  {product?.supply_capacity
                    ? `${product.supply_capacity.value} ${product.supply_capacity.unit}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Minimum Order</p>
                <p>
                  {product?.minimum_order
                    ? `${product.minimum_order.value} ${product.minimum_order.unit}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Packaging Type</p>
                <p>{product?.packaging_type?.label || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivery Date</p>
                <p>{formatDate(product?.delivery_date)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Origin Details</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Year of Origin</p>
                <p>{product?.year_of_origin || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Place of Origin</p>
                <p>{product?.place_of_origin || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Landmark</p>
                <p>{product?.land_mark || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Documents & Images</h3>
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">Product Documents</p>
              {renderDocumentLinks(product?.documents)}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Relevant Documents</p>
              {renderDocumentLinks(product?.relevant_documents)}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Product Images</p>
              {renderDocumentLinks(product?.images)}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t p-4 flex justify-end gap-3 bg-gray-50 sticky bottom-0">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
        {userRole === "agent" ? null : (
          <Button
            onClick={() => handleVerifyToggle(!product?.productVerified)}
            disabled={updatingProduct}
            leftIcon={
              product?.productVerified ? (
                <X size={18} className="mr-2" />
              ) : (
                <CheckCircle size={18} className="mr-2" />
              )
            }
            className={
              product?.productVerified
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {product?.productVerified ? "Unverify Product" : "Verify Product"}
          </Button>
        )}
      </div>

      <DocumentPreview />
    </div>
  );
};

export default ProductPreview;
