//@ts-nocheck
import { Loader, X } from "lucide-react";
import Button from "@/common/button/button";
import { useGetReferralQuery } from "../referral-api";

const ReferralPreview = ({ referralId, onClose }) => {
  const { data, isLoading } = useGetReferralQuery({ id: referralId });
  const referral = data;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96">
        <Loader size={40} className="text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-600">Loading referral information...</p>
      </div>
    );
  }

  return (
    <div className="max-h-screen overflow-auto">
      <div className="p-6 space-y-6">
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-center h-full text-gray-400">
            Referral Details
          </div>
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md">
            <h2 className="text-lg font-semibold">
              {`${referral?.firstName} ${referral?.lastName}` || "N/A"}
            </h2>
            <p className="text-sm text-gray-600">{referral?.email || "N/A"}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Referral Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-sm">{`${referral?.firstName} ${referral?.lastName}` || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm">{referral?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Referral Code</p>
                <p className="text-sm">{referral?.referalCode || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Verification Status</p>
                <p className="text-sm">{referral?.isVerified ? "Verified" : "Not Verified"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Additional Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="text-sm">{formatDate(referral?.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t p-4 flex justify-end gap-3 bg-gray-50 sticky bottom-0">
        <Button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default ReferralPreview;
