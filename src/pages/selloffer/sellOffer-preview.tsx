//@ts-nocheck
import { useState, useEffect } from "react";
import { X, CheckCircle, Loader, FileText, Download, Eye } from "lucide-react";
import Button from "@/common/button/button";
import { useGetSellofferQuery, useUpdateSellOfferMutation } from "./sell-offer-api";
import StatusIndicator from "@/common/status";

interface OriginLocation {
  country: string;
  state?: string;
  city?: string;
}

interface SellOffer {
  id: string;
  title: string;
  productCategory: string;
  detailedDescription: string;
  tags: string[];
  companyName: string;
  companyLogo: string;
  creatorId: string;
  firstName: string;
  lastName: string;
  quantityAndUnit: { quantity: string; unit: string };
  basePrice: { amount: string; currency: string };
  packageType: string;
  packageDescription: string;
  paymentType: string;
  offerValidityDate: string | Date | null;
  originLocation: OriginLocation | string;
  landMark: string;
  isDomestic: boolean;
  isActive: boolean;
  status: boolean;
  productImages: string[];
  thumbnail: string;
}

interface SellOfferPreviewProps {
  offerId: string;
  onClose: () => void;
}

// Utility function to safely parse JSON
const safeParseJSON = (jsonString: string | unknown) => {
  try {
    return typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return null;
  }
};

const SellOfferPreview = ({ offerId, onClose }: SellOfferPreviewProps) => {
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState<boolean>(false);
  const [updateSellOffer, { isLoading: updatingOffer }] = useUpdateSellOfferMutation();
  const { data, isLoading } = useGetSellofferQuery({ id: offerId });
  const offer: SellOffer | undefined = data?.data;

  // Debug offer data
  useEffect(() => {
    console.log("offer:", offer);
    console.log("offer.offerValidityDate:", offer?.offerValidityDate);
    console.log("offer.originLocation:", offer?.originLocation);
  }, [offer]);

  const handleStatusToggle = async (status: boolean) => {
    try {
      // Normalize offerValidityDate and originLocation
      const normalizedOffer = {
        ...offer,
        isActive: status,
        offerValidityDate: offer?.offerValidityDate
          ? typeof offer.offerValidityDate === "string"
            ? offer.offerValidityDate
            : offer.offerValidityDate instanceof Date
            ? offer.offerValidityDate.toISOString()
            : null
          : null,
        originLocation: offer?.originLocation
          ? typeof offer.originLocation === "string"
            ? { country: offer.originLocation, state: "", city: "" }
            : {
                country: offer.originLocation.country || "",
                state: offer.originLocation.state || "",
                city: offer.originLocation.city || "",
              }
          : { country: "", state: "", city: "" },
      };

      await updateSellOffer({
        id: offerId,
        data: normalizedOffer,
      })
        .unwrap()
        .then(() => {
          onClose();
        });
    } catch (error) {
      console.error(`Failed to ${status ? "approve" : "unapprove"} sell offer:`, error);
    }
  };

  const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return "N/A";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date instanceof Date && !isNaN(date.getTime())
      ? date.toLocaleDateString()
      : "Invalid Date";
  };

  const getFileType = (url: string): string => {
    if (!url) return "unknown";
    const extension = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    } else {
      return "other";
    }
  };

  const openDocumentPreview = (docUrl: string) => {
    setDocumentLoading(true);
    setActiveDocument(docUrl);
    setTimeout(() => setDocumentLoading(false), 1000);
  };

  const closeDocumentPreview = () => {
    setActiveDocument(null);
  };

  const renderDocumentLinks = (documents: string[] | null) => {
    if (!documents || documents.length === 0) {
      return <span className="text-gray-400">No documents uploaded</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {documents.map((doc, index) => {
          const fileType = getFileType(doc);
          const fileName = doc.split("/").pop() || `Document ${index + 1}`;

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
    const fileName = activeDocument.split("/").pop() || "Document";
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
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/api/placeholder/300/400";
                  e.currentTarget.className += " border-red-300";
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
        <p className="mt-4 text-gray-600">Loading sell offer information...</p>
      </div>
    );
  }

  return (
    <div className="max-h-screen overflow-auto">
      <div className="p-6 space-y-6">
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          {offer?.thumbnail ? (
            <img
              src={offer?.thumbnail}
              alt="Sell Offer Thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No thumbnail image
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md">
            <h2 className="text-lg font-semibold">{offer?.title || "N/A"}</h2>
            <p className="text-sm text-gray-600">{offer?.productCategory || "N/A"}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Offer Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-sm">{offer?.detailedDescription || "No description provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tags</p>
                {offer?.tags?.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {offer.tags.map((tag, idx) => (
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
                <p className="text-sm text-gray-500">Company Name</p>
                <p>{offer?.companyName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Company Logo</p>
                {offer?.companyLogo ? (
                  <img
                    src={offer.companyLogo}
                    alt="Company Logo"
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <p className="text-gray-400 text-sm">No logo uploaded</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Creator</p>
                <p>{`${offer?.firstName || ""} ${offer?.lastName || ""}`.trim() || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Offer Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p>
                  {offer?.quantityAndUnit
                    ? `${offer.quantityAndUnit.quantity} ${offer.quantityAndUnit.unit}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Base Price</p>
                <p>
                  {offer?.basePrice
                    ? `${offer.basePrice.amount} ${offer.basePrice.currency}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Package Type</p>
                <p>
                  {offer?.packageType ? safeParseJSON(offer.packageType)?.title || "N/A" : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Package Description</p>
                <p>{offer?.packageDescription || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Type</p>
                <p>
                  {offer?.paymentType ? safeParseJSON(offer.paymentType)?.title || "N/A" : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Offer Validity Date</p>
                <p>{formatDate(offer?.offerValidityDate)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Origin Details</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Country of Origin</p>
                <p>
                  {offer?.originLocation
                    ? typeof offer.originLocation === "string"
                      ? offer.originLocation
                      : offer.originLocation.country || "N/A"
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p>
                  {offer?.originLocation
                    ? typeof offer.originLocation === "string"
                      ? "N/A"
                      : offer.originLocation.state || "N/A"
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p>
                  {offer?.originLocation
                    ? typeof offer.originLocation === "string"
                      ? "N/A"
                      : offer.originLocation.city || "N/A"
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Landmark</p>
                <p>{offer?.landMark || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Images</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Product Images</p>
              {renderDocumentLinks(offer?.productImages)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Status</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Domestic</p>
                <p>{offer?.isDomestic ? "Domestic" : "International"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <StatusIndicator status={offer?.isActive ? "active" : "inactive"} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <StatusIndicator status={offer?.status ? "approved" : "not approved"} />
              </div>
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
        <Button
          onClick={() => handleStatusToggle(!offer?.isActive)}
          disabled={updatingOffer}
          leftIcon={
            offer?.isActive ? (
              <X size={18} className="mr-2" />
            ) : (
              <CheckCircle size={18} className="mr-2" />
            )
          }
          className={
            offer?.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          }
        >
          {offer?.isActive ? "Unapprove Offer" : "Approve Offer"}
        </Button>
      </div>

      <DocumentPreview />
    </div>
  );
};

export default SellOfferPreview;
