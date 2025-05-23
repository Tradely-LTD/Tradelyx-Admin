import { useState } from "react";
import {
  X,
  ExternalLink,
  UserCheck,
  Loader,
  FileText,
  Download,
  Eye,
  Globe,
  Mail,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Building2,
  Shield,
  Award,
  Image,
  FileX,
} from "lucide-react";
import { useGetSellerQuery, useUpdateUserMutation } from "../user-api";
import Button from "@/common/button/button";

interface SellerPreviewProps {
  sellerId: number;
  onClose: () => void;
}

export default function SellerPreview({ sellerId, onClose }: SellerPreviewProps) {
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const { data, isLoading } = useGetSellerQuery({ id: sellerId });
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const seller = data?.data;

  const handleApprove = async () => {
    try {
      updateUser({
        id: seller?.userId,
        data: { ...seller, isVerified: true },
      })
        .unwrap()
        .then(() => {
          onClose();
        });
    } catch (error) {
      console.error("Failed to approve seller:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFileType = (url) => {
    if (!url) return "unknown";
    const extension = url.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    } else if (["doc", "docx"].includes(extension)) {
      return "word";
    } else if (["xls", "xlsx", "csv"].includes(extension)) {
      return "spreadsheet";
    } else if (["ppt", "pptx"].includes(extension)) {
      return "presentation";
    } else {
      return "other";
    }
  };

  const openDocumentPreview = (docUrl) => {
    setDocumentLoading(true);
    setActiveDocument(docUrl);
  };

  const closeDocumentPreview = () => {
    setActiveDocument(null);
    setDocumentLoading(false);
  };
  const renderDocumentLinks = (documents) => {
    if (!documents || documents.length === 0)
      return (
        <div className="flex items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
          <div className="text-center">
            <FileX size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents uploaded</p>
          </div>
        </div>
      );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {documents.map((doc, index) => {
          const fileType = getFileType(doc);
          const fileName = doc.split("/").pop();

          let Icon = FileText;
          let bgColor = "bg-gradient-to-r from-blue-50 to-indigo-50";
          let textColor = "text-blue-700";
          let borderColor = "border-blue-200";

          if (fileType === "image") {
            Icon = Image;
            bgColor = "bg-gradient-to-r from-green-50 to-emerald-50";
            textColor = "text-green-700";
            borderColor = "border-green-200";
          } else if (fileType === "pdf") {
            Icon = FileText;
            bgColor = "bg-gradient-to-r from-red-50 to-rose-50";
            textColor = "text-red-700";
            borderColor = "border-red-200";
          }

          return (
            <button
              key={index}
              className={`group relative flex items-center p-3 ${bgColor} ${textColor} ${borderColor} rounded-xl border hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200`}
              title={fileName}
              onClick={() => openDocumentPreview(doc)}
            >
              <div className="flex-shrink-0 mr-3">
                <Icon size={18} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {fileName.length > 20 ? fileName.substring(0, 17) + "..." : fileName}
                </p>
                <p className="text-xs opacity-70 capitalize">{fileType} file</p>
              </div>
              <Eye
                size={16}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              />
            </button>
          );
        })}
      </div>
    );
  };

  const DocumentPreview = () => {
    if (!activeDocument) return null;

    const fileName = activeDocument.split("/").pop();

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-7xl h-[95vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b bg-gray-50 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Document Preview</h3>
                <p className="text-sm text-gray-500 truncate max-w-md">{fileName}</p>
              </div>
            </div>
            <button
              onClick={closeDocumentPreview}
              className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 bg-gray-50">
            {documentLoading ? (
              <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl">
                <div className="p-4 bg-blue-50 rounded-full mb-4">
                  <Loader size={32} className="text-blue-500 animate-spin" />
                </div>
                <p className="text-gray-600 font-medium">Loading document...</p>
                <p className="text-sm text-gray-400 mt-1">
                  Please wait while we prepare your document
                </p>
              </div>
            ) : (
              <iframe
                src={activeDocument}
                title={fileName}
                className="w-full h-full border-0 rounded-xl shadow-inner bg-white"
                onLoad={() => setDocumentLoading(false)}
                onError={() => setDocumentLoading(false)}
              />
            )}
          </div>

          <div className="border-t p-6 bg-gray-50 rounded-b-2xl">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <a
                  href={activeDocument}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl flex items-center hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Open in New Tab
                </a>
                <a
                  href={activeDocument}
                  download={fileName}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-xl flex items-center hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                >
                  <Download size={16} className="mr-2" />
                  Download
                </a>
              </div>
              <button
                onClick={closeDocumentPreview}
                className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-white transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96">
        <div className="p-4 bg-blue-50 rounded-full mb-4">
          <Loader size={40} className="text-blue-500 animate-spin" />
        </div>
        <p className="text-lg font-medium text-gray-700">Loading seller information...</p>
        <p className="text-sm text-gray-500 mt-1">Please wait while we fetch the details</p>
      </div>
    );
  }

  return (
    <div className="max-h-screen overflow-auto bg-gray-50">
      <div className="p-8 space-y-8">
        {/* Header Banner Section */}
        <div className="relative h-48 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl overflow-hidden shadow-lg">
          {seller?.companyInfo.banner ? (
            <img
              src={seller?.companyInfo.banner}
              alt="Company Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="flex items-center justify-center h-full text-white/80">
                <Building2 size={48} />
              </div>
            </div>
          )}

          {/* Company Logo */}
          <div className="absolute bottom-6 left-6 h-20 w-20 bg-white rounded-2xl shadow-xl overflow-hidden flex items-center justify-center border-4 border-white">
            {seller?.companyInfo.logo ? (
              <img
                src={seller?.companyInfo.logo}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                {seller?.companyInfo.name?.charAt(0) || "C"}
              </div>
            )}
          </div>

          {/* Company Name Overlay */}
          <div className="absolute bottom-6 left-32 text-white">
            <h1 className="text-2xl font-bold drop-shadow-lg">
              {seller?.companyInfo.name || "Company Name"}
            </h1>
            <p className="text-white/90 text-sm mt-1">
              {seller?.personalInfo.country || "Location not specified"}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Company Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Building2 size={20} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Company Information</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-500 mb-1">Company Name</p>
                <p className="text-lg font-semibold text-gray-900">
                  {seller?.companyInfo.name || "N/A"}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-500 mb-2">Company Overview</p>
                <p className="text-gray-700 leading-relaxed">
                  {seller?.companyInfo.overview || "No overview provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-2">
                    <Shield size={16} className="text-blue-600 mr-2" />
                    <p className="text-sm font-medium text-blue-800">Registration #</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {seller?.companyInfo.registrationNumber || "N/A"}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex items-center mb-2">
                    <Calendar size={16} className="text-green-600 mr-2" />
                    <p className="text-sm font-medium text-green-800">Incorporated</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatDate(seller?.companyInfo.incorporationDate)}
                  </p>
                </div>
              </div>

              {seller?.companyInfo.website && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <div className="flex items-center mb-2">
                    <Globe size={16} className="text-purple-600 mr-2" />
                    <p className="text-sm font-medium text-purple-800">Website</p>
                  </div>
                  <a
                    href={seller?.companyInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:text-purple-900 font-medium flex items-center group"
                  >
                    {seller?.companyInfo.website}
                    <ExternalLink
                      size={14}
                      className="ml-2 group-hover:translate-x-0.5 transition-transform"
                    />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Mail size={20} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Contact Information</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-500 mb-1">Representative</p>
                <p className="text-lg font-semibold text-gray-900">
                  {`${seller?.personalInfo.firstName} ${seller?.personalInfo.lastName}`}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <div className="flex items-center mb-2">
                  <Mail size={16} className="text-blue-600 mr-2" />
                  <p className="text-sm font-medium text-blue-800">Email Address</p>
                </div>
                <p className="font-medium text-gray-900">{seller?.personalInfo.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                  <div className="flex items-center mb-2">
                    <MapPin size={16} className="text-orange-600 mr-2" />
                    <p className="text-sm font-medium text-orange-800">Country</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {seller?.personalInfo.country || "N/A"}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                  <div className="flex items-center mb-2">
                    <MapPin size={16} className="text-teal-600 mr-2" />
                    <p className="text-sm font-medium text-teal-800">State/Region</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {seller?.personalInfo.state || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <Users size={20} className="text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Business Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 text-center">
              <Users size={24} className="text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800 mb-1">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">
                {seller?.businessDetails.totalStaff || "N/A"}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
              <DollarSign size={24} className="text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800 mb-1">Annual Revenue</p>
              <p className="text-lg font-bold text-gray-900">
                {seller?.businessDetails.estimatedAnnualRevenue || "N/A"}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="flex items-center mb-3">
                <Award size={16} className="text-purple-600 mr-2" />
                <p className="text-sm font-medium text-purple-800">Services</p>
              </div>
              {seller?.businessDetails?.services?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {seller?.businessDetails.services.slice(0, 3).map((service, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium"
                    >
                      {service}
                    </span>
                  ))}
                  {seller?.businessDetails?.services?.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{seller?.businessDetails?.services?.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">None specified</p>
              )}
            </div>

            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
              <div className="flex items-center mb-3">
                <Globe size={16} className="text-orange-600 mr-2" />
                <p className="text-sm font-medium text-orange-800">Main Markets</p>
              </div>
              {seller?.businessDetails?.mainMarkets?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {seller?.businessDetails.mainMarkets.slice(0, 3).map((market, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium"
                    >
                      {market}
                    </span>
                  ))}
                  {seller?.businessDetails.mainMarkets.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{seller?.businessDetails.mainMarkets.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">None specified</p>
              )}
            </div>
          </div>
        </div>

        {/* Documents & Certifications */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <Shield size={20} className="text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Documents & Certifications</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                <FileText size={18} className="mr-2 text-blue-600" />
                Registration Documents
              </h4>
              {renderDocumentLinks(seller?.documents.registrationDocuments)}
            </div>

            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                <Shield size={18} className="mr-2 text-green-600" />
                Export Licenses
              </h4>
              {seller?.documents.exportLicenses ? (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-green-800 font-medium">{seller?.documents.exportLicenses}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                  <div className="text-center">
                    <FileX size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No export licenses</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                <Users size={18} className="mr-2 text-purple-600" />
                Identity Documents
              </h4>
              {renderDocumentLinks(seller?.documents.identityDocuments)}
            </div>

            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                <Award size={18} className="mr-2 text-orange-600" />
                Certifications
              </h4>
              {renderDocumentLinks(seller?.documents.certifications)}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="border-t bg-white/95 backdrop-blur-sm p-6 sticky bottom-0 shadow-lg">
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
          <Button
            onClick={handleApprove}
            disabled={isUpdating}
            loading={isUpdating}
            leftIcon={<UserCheck size={18} className="mr-2" />}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
          >
            {isUpdating ? "Approving..." : "Approve Seller"}
          </Button>
        </div>
      </div>

      <DocumentPreview />
    </div>
  );
}
