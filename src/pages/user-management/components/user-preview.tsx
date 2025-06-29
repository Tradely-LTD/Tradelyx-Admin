import { Loader, Mail, Calendar, User, MapPin, ShieldCheck, Building, Phone } from "lucide-react";
import { useGetUserProfileQuery } from "../user-api";
import StatusIndicator from "@/common/status/index";

interface UserPreviewProps {
  userId: string;
  onClose: () => void;
}

export default function UserPreview({ userId, onClose }: UserPreviewProps) {
  const { data, isLoading, error } = useGetUserProfileQuery({ id: userId });
  const user = data?.data;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96 bg-gray-50">
        <Loader size={32} className="text-gray-600 animate-spin mb-2" />
        <p className="text-gray-600">Loading user information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96 bg-gray-50">
        <p className="text-red-600">Failed to load user information.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="max-h-screen overflow-auto bg-gray-50">
      <div className="p-6 space-y-6">
        <div className="relative flex items-center space-x-4">
          <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="User"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User size={48} className="text-gray-500" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-md text-gray-600 capitalize">{user?.role || "User"}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
              <User size={20} className="text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>
            <div className="space-y-3">
              <InfoItem icon={<Mail size={16} />} label="Email Address" value={user?.email} />
              <InfoItem
                icon={<Phone size={16} />}
                label="Phone Number"
                value={user?.phone || "N/A"}
              />
              <InfoItem
                icon={<Calendar size={16} />}
                label="Member Since"
                value={formatDate(user?.createdAt)}
              />
              <InfoItem
                icon={<MapPin size={16} />}
                label="Location"
                value={`${user?.state || "N/A"}, ${user?.country || "N/A"}`}
              />
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
              <ShieldCheck size={20} className="text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">KYC Verified</span>
                <StatusIndicator status={user?.isKYCCompleted ? "verified" : "not verify"} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Account Active</span>
                <StatusIndicator status={user?.status ? "active" : "inactive"} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Company Account</span>
                <StatusIndicator status={user?.isCompany ? "company" : "individual"} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t bg-white p-4 sticky bottom-0">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
}) => (
  <div className="p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center mb-1">
      <span className="text-gray-600 mr-2">{icon}</span>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
    <p className="font-medium text-gray-900 ml-8">{value}</p>
  </div>
);
