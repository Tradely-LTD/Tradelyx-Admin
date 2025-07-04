//@ts-nocheck
import {
  UserCheck,
  Loader,
  FileText,
  ExternalLink,
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
import { useGetUserQuery, useUpdateUserMutation } from "../user-api";
import Button from "@/common/button/button";

interface SellerPreviewProps {
  sellerId: number;
  onClose: () => void;
}

export default function SellerPreview({ sellerId, onClose }: SellerPreviewProps) {
  const { data, isLoading } = useGetUserQuery({ id: sellerId });
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const seller = data;

  const handleApprove = async () => {
    try {
      await updateUser({
        id: seller?.userId,
        data: { ...seller, isVerified: true },
      }).unwrap();
      onClose();
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
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)) return "image";
    if (extension === "pdf") return "pdf";
    if (["doc", "docx"].includes(extension)) return "word";
    if (["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet";
    if (["ppt", "pptx"].includes(extension)) return "presentation";
    return "other";
  };

  const renderDocumentLinks = (documents) => {
    // Convert single string to array if necessary
    const docArray = Array.isArray(documents) ? documents : documents ? [documents] : [];

    if (!docArray || docArray.length === 0) {
      return (
        <div className="flex items-center justify-center py-6 text-gray-500 bg-gray-100 rounded-lg border border-gray-200">
          <div className="text-center">
            <FileX size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents uploaded</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {docArray.map((doc, index) => {
          const fileType = getFileType(doc);
          const fileName = doc.split("/").pop();
          let Icon = FileText;
          let bgColor = "bg-gray-50";
          let textColor = "text-gray-700";
          let borderColor = "border-gray-200";

          if (fileType === "image") {
            Icon = Image;
            bgColor = "bg-blue-50";
            textColor = "text-blue-700";
            borderColor = "border-blue-200";
          } else if (fileType === "pdf") {
            Icon = FileText;
            bgColor = "bg-red-50";
            textColor = "text-red-700";
            borderColor = "border-red-200";
          }

          return (
            <a
              key={index}
              href={doc}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center p-3 ${bgColor} ${textColor} ${borderColor} rounded-lg border hover:bg-gray-100 transition-colors`}
              title={fileName}
            >
              <div className="flex-shrink-0 mr-3">
                <Icon size={18} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {fileName.length > 20 ? fileName.substring(0, 17) + "..." : fileName}
                </p>
                <p className="text-xs capitalize">{fileType} file</p>
              </div>
              <ExternalLink size={16} className="opacity-70" />
            </a>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96 bg-gray-50">
        <Loader size={32} className="text-gray-600 animate-spin mb-2" />
        <p className="text-gray-600">Loading seller information...</p>
      </div>
    );
  }

  return (
    <div className="max-h-screen overflow-auto bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header Banner Section */}
        <div className="relative h-40 bg-gray-200 rounded-lg overflow-hidden">
          {seller?.companyInfo.banner ? (
            <img
              src={seller?.companyInfo.banner}
              alt="Company Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
              <Building2 size={32} className="text-gray-500" />
            </div>
          )}

          <div className="absolute bottom-4 left-4 h-16 w-16 bg-white rounded-lg shadow-md flex items-center justify-center border border-gray-200">
            {seller?.companyInfo.logo ? (
              <img
                src={seller?.companyInfo.logo}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-600 text-lg font-bold">
                {seller?.companyInfo.name?.charAt(0) || "C"}
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-24 text-gray-900">
            <h1 className="text-xl font-semibold">{seller?.companyInfo.name || "Company Name"}</h1>
            <p className="text-sm text-gray-600">{seller?.personalInfo.country || "N/A"}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
              <Building2 size={20} className="text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Company Name</p>
                <p className="font-medium text-gray-900">{seller?.companyInfo.name || "N/A"}</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Company Overview</p>
                <p className="text-gray-700">
                  {seller?.companyInfo.overview || "No overview provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-1">
                    <Shield size={16} className="text-gray-600 mr-2" />
                    <p className="text-sm text-gray-500">Registration #</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {seller?.companyInfo.registrationNumber || "N/A"}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-1">
                    <Calendar size={16} className="text-gray-600 mr-2" />
                    <p className="text-sm text-gray-500">Incorporated</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatDate(seller?.companyInfo.incorporationDate)}
                  </p>
                </div>
              </div>

              {seller?.companyInfo.website && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-1">
                    <Globe size={16} className="text-gray-600 mr-2" />
                    <p className="text-sm text-gray-500">Website</p>
                  </div>
                  <a
                    href={seller?.companyInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    {seller?.companyInfo.website}
                    <ExternalLink size={14} className="ml-1" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
              <Mail size={20} className="text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Representative</p>
                <p className="font-medium text-gray-900">
                  {`${seller?.personalInfo.firstName} ${seller?.personalInfo.lastName}`}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-1">
                  <Mail size={16} className="text-gray-600 mr-2" />
                  <p className="text-sm text-gray-500">Email Address</p>
                </div>
                <p className="font-medium text-gray-900">{seller?.personalInfo.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-1">
                    <MapPin size={16} className="text-gray-600 mr-2" />
                    <p className="text-sm text-gray-500">Country</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {seller?.personalInfo.country || "N/A"}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-1">
                    <MapPin size={16} className="text-gray-600 mr-2" />
                    <p className="text-sm text-gray-500">State/Region</p>
                  </div>
                  <p className="font-medium text-gray-900">{seller?.personalInfo.state || "N/A"}</p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-1">
                  <MapPin size={16} className="text-gray-600 mr-2" />
                  <p className="text-sm text-gray-500">Address</p>
                </div>
                <p className="font-medium text-gray-900">{seller?.personalInfo.address || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center mb-4">
            <Users size={20} className="text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <Users size={20} className="text-gray-600 mx-auto mb-1" />
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="font-medium text-gray-900">
                {seller?.businessDetails.totalStaff || "N/A"}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <DollarSign size={20} className="text-gray-600 mx-auto mb-1" />
              <p className="text-sm text-gray-500">Annual Revenue</p>
              <p className="font-medium text-gray-900">
                {seller?.businessDetails.estimatedAnnualRevenue || "N/A"}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <Award size={16} className="text-gray-600 mr-2" />
                <p className="text-sm text-gray-500">Services</p>
              </div>
              {seller?.businessDetails?.services?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {seller?.businessDetails.services.slice(0, 3).map((service, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                    >
                      {service}
                    </span>
                  ))}
                  {seller?.businessDetails?.services?.length > 3 && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                      +{seller?.businessDetails?.services?.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">None specified</p>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <Globe size={16} className="text-gray-600 mr-2" />
                <p className="text-sm text-gray-500">Main Markets</p>
              </div>
              {seller?.businessDetails?.mainMarkets?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {seller?.businessDetails.mainMarkets.slice(0, 3).map((market, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                    >
                      {market}
                    </span>
                  ))}
                  {seller?.businessDetails.mainMarkets.length > 3 && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                      +{seller?.businessDetails.mainMarkets.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">None specified</p>
              )}
            </div>
          </div>
        </div>

        {/* Documents & Certifications */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center mb-4">
            <Shield size={20} className="text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Documents & Certifications</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                <FileText size={16} className="text-gray-600 mr-2" />
                Registration Documents
              </h4>
              {renderDocumentLinks(seller?.documents.registrationDocuments)}
            </div>

            <div>
              <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                <Shield size={16} className="text-gray-600 mr-2" />
                Export Licenses
              </h4>
              {renderDocumentLinks(seller?.documents.exportLicenses)}
            </div>

            <div>
              <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                <Users size={16} className="text-gray-600 mr-2" />
                Identity Documents
              </h4>
              {renderDocumentLinks(seller?.documents.identityDocuments)}
            </div>

            <div>
              <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                <Award size={16} className="text-gray-600 mr-2" />
                Certifications
              </h4>
              {renderDocumentLinks(seller?.documents.certifications)}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="border-t bg-white p-4 sticky bottom-0 shadow">
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <Button
            onClick={handleApprove}
            disabled={isUpdating}
            loading={isUpdating}
            leftIcon={<UserCheck size={16} className="mr-2" />}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isUpdating ? "Approving..." : "Approve Seller"}
          </Button>
        </div>
      </div>
    </div>
  );
}
