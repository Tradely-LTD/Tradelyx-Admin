//@ts-nocheck
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "@/common/input/input";
import Button from "@/common/button/button";
import { Loader } from "@/common/loader/loader";
import { useMemo, useState } from "react";
import { PackageTypesForm, ProductCategories, Units } from "@/constant";
import { useGetUserQuery, useGetUsersQuery } from "@/pages/user-management/user-api";
import { Save } from "lucide-react";
import { useUploadsFileMutation } from "@/store/uploads";
import FileUploader from "@/common/files-uploader";
import {
  useGetSellofferQuery,
  useCreateSellOfferMutation,
  useUpdateSellOfferMutation,
} from "../selloffer/sell-offer-api";
import { useUserSlice } from "../auth/authSlice";

// Utility function to safely parse JSON
const safeParseJSON = (jsonString: string | unknown) => {
  try {
    return typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return null;
  }
};

// Validation schema using Yup
const validationSchema = yup.object({
  title: yup.string().required("Offer title is required"),
  creatorId: yup
    .object()
    .shape({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .when("$isEditMode", {
      is: false,
      then: (schema) => schema.required("Seller is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  createdById: yup.string().required("Creator is required"),
  productCategory: yup
    .object()
    .shape({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .required("Product category is required"),
  packageType: yup
    .object()
    .shape({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .when("$isEditMode", {
      is: false,
      then: (schema) => schema.required("Package type is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  detailedDescription: yup.string().required("Description is required"),
  thumbnail: yup.string().nullable(),
  companyLogo: yup.string().nullable(),
  companyName: yup.string().nullable(),
  tags: yup.array().of(yup.string()).default([]),
  productImages: yup.array().of(yup.string().max(255)).default([]),
  packageDescription: yup.string().nullable(),
  landMark: yup.string().nullable(),
  isDomestic: yup.boolean().default(true),
  isActive: yup.boolean().default(true),
  status: yup.boolean().default(false),
  quantityAndUnit: yup
    .object()
    .shape({
      unit: yup.string().required("Unit is required"),
      quantity: yup
        .string()
        .required("Quantity is required")
        .matches(/^[0-9]+$/, "Quantity must be a number"),
    })
    .nullable(),
  basePrice: yup
    .object()
    .shape({
      amount: yup
        .string()
        .required("Price is required")
        .matches(/^[0-9]+(\.[0-9]{1,2})?$/, "Invalid price format"),
      currency: yup.string().required("Currency is required"),
    })
    .required("Base price is required"),
  paymentType: yup
    .object()
    .shape({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .required("Payment type is required"),
  originLocation: yup
    .object()
    .shape({
      country: yup.string().required("Country is required"),
      city: yup.string().nullable(),
    })
    .required("Origin location is required"),
  offerValidityDate: yup.date().nullable(),
});

interface SellOfferFormProps {
  id?: string;
  onClose?: () => void;
}

function SellOfferForm({ id, onClose }: SellOfferFormProps) {
  const isEditMode = !!id;
  const [userId, setUserId] = useState("");
  const [createSellOffer, { isLoading: isCreating }] = useCreateSellOfferMutation();
  const [updateSellOffer, { isLoading: isUpdating }] = useUpdateSellOfferMutation();
  const { data, isLoading: isLoadingOffer } = useGetSellofferQuery({ id }, { skip: !id });
  const offerData = data?.data;
  const { loginResponse } = useUserSlice();
  const adminId = loginResponse?.user.id;
  const { data: users, isLoading: loadingUsers } = useGetUsersQuery({ limit: 500, role: "seller" });
  const { data: user, isLoading: loadingUser } = useGetUserQuery({ id: userId }, { skip: !userId });
  const [uploadsFile] = useUploadsFileMutation();

  // Set company data from user response
  const companyName = user?.data?.companyInfo?.name || offerData?.companyName || "";
  const companyLogo = user?.data?.companyInfo?.logo || offerData?.companyLogo || "";

  const defaultValues = useMemo(
    () => ({
      title: offerData?.title || "",
      creatorId: offerData?.creatorId
        ? { label: offerData.creatorId, value: offerData.creatorId }
        : { label: "", value: "" },
      createdById: offerData?.createdById || adminId || "",
      productCategory: offerData?.productCategory
        ? { label: offerData.productCategory, value: offerData.productCategory }
        : { label: "", value: "" },
      packageType: isEditMode
        ? null
        : offerData?.packageType
        ? {
            label: safeParseJSON(offerData.packageType)?.title || offerData.packageType,
            value: safeParseJSON(offerData.packageType)?.value || offerData.packageType,
          }
        : { label: "", value: "" },
      detailedDescription: offerData?.detailedDescription || "",
      thumbnail: offerData?.thumbnail || null,
      companyLogo: companyLogo || null,
      companyName: companyName || null,
      tags: offerData?.tags || [],
      productImages: offerData?.productImages || [],
      packageDescription: offerData?.packageDescription || null,
      landMark: offerData?.landMark || null,
      isDomestic: offerData?.isDomestic ?? true,
      isActive: offerData?.isActive ?? true,
      status: offerData?.status ?? false,
      quantityAndUnit: offerData?.quantityAndUnit || { unit: "", quantity: "" },
      basePrice: offerData?.basePrice || { amount: "", currency: "" },
      paymentType: offerData?.paymentType
        ? {
            label: safeParseJSON(offerData.paymentType)?.title || offerData.paymentType,
            value: safeParseJSON(offerData.paymentType)?.value || offerData.paymentType,
          }
        : { label: "", value: "" },
      originLocation: offerData?.originLocation
        ? typeof offerData.originLocation === "string"
          ? { country: offerData.originLocation, city: "" }
          : offerData.originLocation
        : { country: "", city: "" },
      offerValidityDate: offerData?.offerValidityDate || null,
    }),
    [offerData, isEditMode, adminId, companyName, companyLogo]
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues,
    values: offerData
      ? {
          ...defaultValues,
          creatorId: offerData.creatorId
            ? { label: offerData.creatorId, value: offerData.creatorId }
            : { label: "", value: "" },
          createdById: offerData.createdById || adminId || "",
          productCategory: offerData.productCategory
            ? { label: offerData.productCategory, value: offerData.productCategory }
            : { label: "", value: "" },
          packageType: isEditMode
            ? null
            : offerData.packageType
            ? {
                label: safeParseJSON(offerData.packageType)?.title || offerData.packageType,
                value: safeParseJSON(offerData.packageType)?.value || offerData.packageType,
              }
            : { label: "", value: "" },
          paymentType: offerData.paymentType
            ? {
                label: safeParseJSON(offerData.paymentType)?.title || offerData.paymentType,
                value: safeParseJSON(offerData.paymentType)?.value || offerData.paymentType,
              }
            : { label: "", value: "" },
          companyName: companyName || null,
          companyLogo: companyLogo || null,
          originLocation: offerData.originLocation
            ? typeof offerData.originLocation === "string"
              ? { country: offerData.originLocation, city: "" }
              : offerData.originLocation
            : { country: "", city: "" },
        }
      : undefined,
    context: { isEditMode },
  });

  const processSubmit = async (formData: any) => {
    try {
      const payload = {
        ...formData,
        productCategory: formData.productCategory.value,
        packageType: formData.packageType
          ? JSON.stringify({ title: formData.packageType.label, value: formData.packageType.value })
          : null,
        creatorId: formData.creatorId?.value,
        createdById: isEditMode ? offerData.createdById : adminId,
        paymentType: JSON.stringify({
          title: formData.paymentType.label,
          value: formData.paymentType.value,
        }),
        tags: formData.tags || [],
        productImages: formData.productImages || [],
        quantityAndUnit:
          formData.quantityAndUnit.unit && formData.quantityAndUnit.quantity
            ? { unit: formData.quantityAndUnit.unit, quantity: formData.quantityAndUnit.quantity }
            : null,
        basePrice:
          formData.basePrice.amount && formData.basePrice.currency
            ? { amount: formData.basePrice.amount, currency: formData.basePrice.currency }
            : null,
        originLocation: formData.originLocation.country
          ? { country: formData.originLocation.country, city: formData.originLocation.city }
          : null,
        companyName: companyName || null,
        companyLogo: companyLogo || null,
      };

      if (!isEditMode) {
        delete payload.id;
      }

      if (isEditMode) {
        await updateSellOffer({ id, data: payload })
          .unwrap()
          .then(() => {
            if (onClose) {
              onClose();
            }
          });
      } else {
        await createSellOffer(payload)
          .unwrap()
          .then(() => {
            if (onClose) {
              onClose();
            }
          });
      }
    } catch (error) {
      console.error(
        isEditMode ? "Failed to update sell offer:" : "Failed to create sell offer:",
        error
      );
    }
  };

  const isSubmitDisabled = isCreating || isUpdating;

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      {isLoadingOffer ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Offer Details */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Offer Details</h3>
              <div className="space-y-4">
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Offer Title"
                      error={errors.title?.message}
                      required
                      {...field}
                    />
                  )}
                />

                {!isEditMode && (
                  <Controller
                    name="creatorId"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="select"
                        label="Seller"
                        isLoading={loadingUsers}
                        error={errors.creatorId?.value?.message}
                        options={users?.data.map((seller) => ({
                          label: `${seller.firstName} ${seller.lastName}`,
                          value: seller.id,
                        }))}
                        required
                        value={field.value}
                        onSelectChange={(option) => {
                          setUserId(option?.value ?? "");
                          field.onChange(option);
                        }}
                      />
                    )}
                  />
                )}

                <Controller
                  name="productCategory"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="select"
                      label="Product Category"
                      error={errors.productCategory?.value?.message}
                      options={ProductCategories.map((cat) => ({
                        label: cat.title,
                        value: cat.value,
                      }))}
                      required
                      value={field.value}
                      onSelectChange={(option) => field.onChange(option)}
                    />
                  )}
                />

                <Controller
                  name="detailedDescription"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="textarea"
                      label="Detailed Description"
                      error={errors.detailedDescription?.message}
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
                  productData={offerData}
                  fieldName="thumbnail"
                  isMultiple={false}
                  label="Thumbnail"
                  accept="image/*"
                />

                <Controller
                  name="tags"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Tags (comma-separated)"
                      error={errors.tags?.message}
                      value={field.value.join(", ")}
                      onChange={(e) =>
                        field.onChange(e.target.value.split(",").map((tag) => tag.trim()))
                      }
                    />
                  )}
                />
              </div>
            </div>

            {/* Company Information */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Company Information</h3>
              <div className="space-y-4">
                {(userId || isEditMode) && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Company Name
                      </label>
                      <p className="mt-1 text-gray-900">{companyName || "N/A"}</p>
                    </div>
                    {companyLogo && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Company Logo
                        </label>
                        <img
                          src={companyLogo}
                          alt="Company Logo"
                          className="mt-1 h-20 w-20 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                <FileUploader
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  uploadsFile={uploadsFile}
                  productData={offerData}
                  arrayFieldName="productImages"
                  isMultiple={true}
                  maxFiles={3}
                  label="Product Images (Maximum 3)"
                  accept="image/*"
                />

                {!isEditMode && (
                  <Controller
                    name="packageType"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        type="select"
                        label="Package Type"
                        options={PackageTypesForm.map((unit) => ({
                          label: unit.title,
                          value: unit.value,
                        }))}
                        error={fieldState.error?.message}
                        required
                        value={field.value}
                        onSelectChange={(option) => field.onChange(option)}
                      />
                    )}
                  />
                )}

                <Controller
                  name="packageDescription"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="textarea"
                      label="Package Description"
                      error={errors.packageDescription?.message}
                      value={value || ""}
                      onChange={onChange}
                      {...field}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Offer Details */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Offer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Quantity and Unit</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="quantityAndUnit.unit"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="select"
                        label="Unit"
                        error={errors.quantityAndUnit?.unit?.message}
                        options={Units.map((unit) => ({
                          label: unit.title,
                          value: unit.value,
                        }))}
                        required
                        value={
                          field.value
                            ? {
                                label:
                                  Units.find((u) => u.value === field.value)?.title || field.value,
                                value: field.value,
                              }
                            : null
                        }
                        onSelectChange={(option) => field.onChange(option.value)}
                      />
                    )}
                  />
                  <Controller
                    name="quantityAndUnit.quantity"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="text"
                        label="Quantity"
                        error={errors.quantityAndUnit?.quantity?.message}
                        required
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Base Price</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="basePrice.amount"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="text"
                        label="Price"
                        error={errors.basePrice?.amount?.message}
                        required
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="basePrice.currency"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="select"
                        label="Currency"
                        error={errors.basePrice?.currency?.message}
                        options={[
                          { label: "USD", value: "USD" },
                          { label: "EUR", value: "EUR" },
                          { label: "NGN", value: "NGN" },
                        ]}
                        required
                        value={
                          field.value
                            ? {
                                label: field.value,
                                value: field.value,
                              }
                            : null
                        }
                        onSelectChange={(option) => field.onChange(option.value)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location and Logistics */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Location and Logistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Controller
                name="originLocation.country"
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    label="Country of Origin"
                    error={errors.originLocation?.country?.message}
                    required
                    {...field}
                  />
                )}
              />

              <Controller
                name="originLocation.city"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    type="text"
                    label="City"
                    error={errors.originLocation?.city?.message}
                    value={value || ""}
                    onChange={onChange}
                    {...field}
                  />
                )}
              />

              <Controller
                name="landMark"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    type="text"
                    label="Landmark"
                    error={errors.landMark?.message}
                    value={value || ""}
                    onChange={onChange}
                    {...field}
                  />
                )}
              />
            </div>

            <Controller
              name="paymentType"
              control={control}
              render={({ field }) => (
                <Input
                  type="select"
                  label="Payment Type"
                  error={errors.paymentType?.value?.message}
                  options={[
                    { label: "Bank Transfer", value: "bank_transfer" },
                    { label: "Credit Card", value: "credit_card" },
                    { label: "Cash on Delivery", value: "cod" },
                    { label: "Advance Payment", value: "Advance Payment" },
                  ]}
                  required
                  value={field.value}
                  onSelectChange={(option) => field.onChange(option)}
                />
              )}
            />

            <Controller
              name="offerValidityDate"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Input
                  type="date"
                  label="Offer Validity Date"
                  error={errors.offerValidityDate?.message}
                  value={value || ""}
                  onChange={onChange}
                  {...field}
                />
              )}
            />
          </div>

          {/* Offer Status */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Offer Status</h3>
            <div className="flex items-center space-x-3">
              <Controller
                name="isDomestic"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-0"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    <span>Domestic</span>
                  </label>
                )}
              />
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-0"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    <span>Active</span>
                  </label>
                )}
              />
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-0"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    <span>Approved</span>
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
              {isEditMode ? "Update Offer" : "Create Offer"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

export default SellOfferForm;
