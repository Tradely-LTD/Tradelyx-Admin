//@ts-nocheck
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "@/common/input/input";
import Button from "@/common/button/button";
import { Save } from "lucide-react";
import { useMemo } from "react";
import FileUploader from "@/common/files-uploader";
import {
  useGetUserQuery,
  useCreateSellerProfileMutation,
  useUpdateSellerProfileMutation,
} from "../user-api";
import { Loader } from "@/common/loader/loader";
import { useUploadsFileMutation } from "@/store/uploads";

// Interface for the nested API response
interface SellerApiResponse {
  userId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    state: string;
  };
  companyInfo: {
    name: string;
    logo: string | null;
    banner: string | null;
    website: string | null;
    overview: string;
    incorporationDate: string | null;
    registrationNumber: string | null;
  };
  businessDetails: {
    totalStaff: string;
    estimatedAnnualRevenue: string;
    services: string[];
    mainMarkets: string[];
    languagesSpoken: string[];
  };
  documents: {
    registrationDocuments: string[];
    exportLicenses: string | null;
    identityDocuments: string[];
    certifications: string[];
  };
}

// Interface for the flat form and database structure
interface SellerProfile {
  id?: string;
  companyName: string;
  companyLogo: string | null;
  companyBanner: string | null;
  companyWebsite: string | null;
  businessOverview: string;
  dateOfIncorporation: string | null;
  registrationNumber: string | null;
  totalStaff: string | null;
  estAnnualRevenue: string | null;
  companyRegistrationDoc: string[];
  exportLicenses: string | null;
  identityDoctype: string[];
  businessServices: string[];
  mainMarkets: string[];
  languageSpoken: string[];
  certificationDocuments: string[];
  companyVerified: boolean;
}

// Validation schema using Yup
const validationSchema = yup.object({
  companyName: yup.string().required("Company name is required"),
  companyWebsite: yup.string().nullable().notRequired().url("Must be a valid URL"),
  businessOverview: yup.string().required("Business overview is required"),
  dateOfIncorporation: yup.string().nullable(),
  registrationNumber: yup.string().max(255).nullable(),
  totalStaff: yup.string().max(50).nullable(),
  estAnnualRevenue: yup.string().max(50).nullable(),
  companyLogo: yup.string().nullable(),
  companyBanner: yup.string().nullable(),
  companyRegistrationDoc: yup.array().of(yup.string().max(255)).default([]),
  exportLicenses: yup.string().nullable(),
  identityDoctype: yup.array().of(yup.string().max(255)).default([]),
  businessServices: yup.array().of(yup.string().max(255)).default([]),
  mainMarkets: yup.array().of(yup.string().max(255)).default([]),
  languageSpoken: yup.array().of(yup.string().max(255)).default([]),
  certificationDocuments: yup.array().of(yup.string().max(255)).default([]),
  companyVerified: yup.boolean().default(false),
});

interface SellerProfileFormProps {
  id?: string;
  onClose?: () => void;
}

function SellerProfileForm({ id, onClose }: SellerProfileFormProps) {
  const isEditMode = !!id;
  const [createSellerProfile, { isLoading: isCreating }] = useCreateSellerProfileMutation();
  const [updateSellerProfile, { isLoading: isUpdating }] = useUpdateSellerProfileMutation();
  const { data, isLoading: isLoadingProfile } = useGetUserQuery({ id }, { skip: !id });
  const [uploadsFile] = useUploadsFileMutation();

  // Map nested API response to flat SellerProfile structure
  const profileData = useMemo<SellerProfile | undefined>(() => {
    if (!data?.data) return undefined;
    const { companyInfo, businessDetails, documents } = data.data as SellerApiResponse;
    return {
      id: data.data.userId,
      companyName: companyInfo.name,
      companyLogo: companyInfo.logo,
      companyBanner: companyInfo.banner,
      companyWebsite: companyInfo.website,
      businessOverview: companyInfo.overview,
      dateOfIncorporation: companyInfo.incorporationDate,
      registrationNumber: companyInfo.registrationNumber,
      companyVerified: companyInfo.companyVerified,

      totalStaff: businessDetails.totalStaff,
      estAnnualRevenue: businessDetails.estimatedAnnualRevenue,
      companyRegistrationDoc: documents.registrationDocuments,
      exportLicenses: documents.exportLicenses,
      identityDoctype: documents.identityDocuments,
      businessServices: businessDetails.services,
      mainMarkets: businessDetails.mainMarkets,
      languageSpoken: businessDetails.languagesSpoken,
      certificationDocuments: documents.certifications,
    };
  }, [data?.data]);

  // Define default values for the form
  const defaultValues = useMemo<SellerProfile>(() => {
    let formattedDate = null;

    if (profileData?.dateOfIncorporation) {
      const date = new Date(profileData.dateOfIncorporation);
      if (!isNaN(date.getTime())) {
        formattedDate = format(date, "yyyy-MM-dd");
      }
    }

    return {
      id: profileData?.id,
      companyName: profileData?.companyName || "",
      companyWebsite: profileData?.companyWebsite || null,
      businessOverview: profileData?.businessOverview || "",
      dateOfIncorporation: formattedDate,
      registrationNumber: profileData?.registrationNumber || null,
      totalStaff: profileData?.totalStaff || null,
      estAnnualRevenue: profileData?.estAnnualRevenue || null,
      companyLogo: profileData?.companyLogo || null,
      companyBanner: profileData?.companyBanner || null,
      companyRegistrationDoc: profileData?.companyRegistrationDoc || [],
      exportLicenses: profileData?.exportLicenses || null,
      identityDoctype: profileData?.identityDoctype || [],
      businessServices: profileData?.businessServices || [],
      mainMarkets: profileData?.mainMarkets || [],
      languageSpoken: profileData?.languageSpoken || [],
      certificationDocuments: profileData?.certificationDocuments || [],
      companyVerified: profileData?.companyVerified || false,
    };
  }, [profileData]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SellerProfile>({
    resolver: yupResolver(validationSchema),
    defaultValues,
    values: profileData ? defaultValues : undefined,
  });

  const processSubmit = async (formData: SellerProfile) => {
    try {
      const payload: SellerProfile = {
        ...formData,
        id: formData.id,
        companyRegistrationDoc: formData.companyRegistrationDoc || [],
        identityDoctype: formData.identityDoctype || [],
        businessServices: formData.businessServices || [],
        mainMarkets: formData.mainMarkets || [],
        languageSpoken: formData.languageSpoken || [],
        certificationDocuments: formData.certificationDocuments || [],
      };

      if (isEditMode && id) {
        await updateSellerProfile({ id, data: payload })
          .unwrap()
          .then(() => {
            if (onClose) onClose();
          });
      } else {
        await createSellerProfile(payload)
          .unwrap()
          .then(() => {
            if (onClose) onClose();
          });
      }
    } catch (error) {
      console.error(isEditMode ? "Failed to update profile:" : "Failed to create profile:", error);
    }
  };

  const isSubmitDisabled = isCreating || isUpdating;

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      {isLoadingProfile ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Details */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Company Details</h3>
              <div className="space-y-4">
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Company Name"
                      error={errors.companyName?.message}
                      required
                      {...field}
                    />
                  )}
                />
                <Controller
                  name="companyWebsite"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Company Website"
                      error={errors.companyWebsite?.message}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
                <Controller
                  name="businessOverview"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="textarea"
                      label="Business Overview"
                      error={errors.businessOverview?.message}
                      required
                      {...field}
                    />
                  )}
                />
                <FileUploader
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  uploadsFile={uploadsFile}
                  productData={profileData}
                  fieldName="companyLogo"
                  isMultiple={false}
                  label="Company Logo"
                  accept="image/*"
                />
                <FileUploader
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  uploadsFile={uploadsFile}
                  productData={profileData}
                  fieldName="companyBanner"
                  isMultiple={false}
                  label="Company Banner"
                  accept="image/*"
                />
              </div>
            </div>

            {/* Business Details */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Business Details</h3>
              <div className="space-y-4">
                <Controller
                  name="dateOfIncorporation"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="date"
                      label="Date of Incorporation"
                      error={errors.dateOfIncorporation?.message}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
                <Controller
                  name="registrationNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Company Registration Number"
                      placeholder="Eg: Business Registration/CAC/LLC Registration Number"
                      error={errors.registrationNumber?.message}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
                <Controller
                  name="totalStaff"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Total Staff"
                      error={errors.totalStaff?.message}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
                <Controller
                  name="estAnnualRevenue"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Estimated Annual Revenue"
                      error={errors.estAnnualRevenue?.message}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
                <FileUploader
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  uploadsFile={uploadsFile}
                  productData={profileData}
                  arrayFieldName="companyRegistrationDoc"
                  isMultiple={true}
                  maxFiles={3}
                  label="Company Registration Documents (Maximum 3)"
                  accept="application/pdf,image/*"
                />
              </div>
            </div>
          </div>

          {/* Additional Documents */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Additional Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploader
                control={control}
                watch={watch}
                setValue={setValue}
                uploadsFile={uploadsFile}
                productData={profileData}
                fieldName="exportLicenses"
                isMultiple={false}
                label="Export Licenses"
                accept="application/pdf,image/*"
              />
              <FileUploader
                control={control}
                watch={watch}
                setValue={setValue}
                uploadsFile={uploadsFile}
                productData={profileData}
                arrayFieldName="identityDoctype"
                isMultiple={true}
                maxFiles={3}
                label="Identity Documents (Maximum 3)"
                accept="application/pdf,image/*"
              />
              <FileUploader
                control={control}
                watch={watch}
                setValue={setValue}
                uploadsFile={uploadsFile}
                productData={profileData}
                arrayFieldName="certificationDocuments"
                isMultiple={true}
                maxFiles={3}
                label="Certification Documents (Maximum 3)"
                accept="application/pdf,image/*"
              />
            </div>
          </div>

          {/* Business Services and Markets */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Services and Markets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="businessServices"
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    label="Business Services (comma-separated)"
                    error={errors.businessServices?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="mainMarkets"
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    label="Main Markets (comma-separated)"
                    error={errors.mainMarkets?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="languageSpoken"
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    label="Languages Spoken (comma-separated)"
                    error={errors.languageSpoken?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </div>

          {/* Verification Status */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Verification Status</h3>
            <div className="flex items-center space-x-3">
              <Controller
                name="companyVerified"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-0"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <span>Company Verified</span>
                  </label>
                )}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="outlined" disabled={isSubmitDisabled} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              loading={isCreating || isUpdating}
              leftIcon={<Save />}
            >
              {isEditMode ? "Update Profile" : "Create Profile"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

export default SellerProfileForm;
