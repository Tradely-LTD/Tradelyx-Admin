//@ts-nocheck
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "@/common/input/input";
import Button from "@/common/button/button";
import {
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
} from "../product-api";
import { Loader } from "@/common/loader/loader";
import { useMemo } from "react";
import { PackageTypesForm, ProductCategories, Units } from "@/constant";
import { useGetUsersQuery } from "@/pages/user-management/user-api";
import { Save } from "lucide-react";
import { useUploadsFileMutation } from "@/store/uploads";
import FileUploader from "@/common/files-uploader";
import { useUserSlice } from "@/pages/auth/authSlice";

// Validation schema using Yup
const validationSchema = yup.object({
  title: yup.string().required("Product title is required"),
  category: yup
    .object()
    .shape({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .required("Category is required"),
  description: yup.string().required("Description is required"),
  creatorId: yup
    .object()
    .shape({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .when("$isEditMode", {
      is: false,
      then: (schema) => schema.required("Product Owner is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  thumbnail: yup.string().nullable(),
  tags: yup.array().of(yup.string()).default([]),
  certifications: yup
    .string()
    .max(255, "Certifications must be less than 255 characters")
    .nullable(),
  documents: yup.array().of(yup.string().max(255)).default([]),
  images: yup.array().of(yup.string().max(255)).default([]),
  specification: yup.string().nullable(),
  supply_capacity: yup
    .object()
    .shape({
      unit: yup.string().required("Unit is required"),
      value: yup
        .string()
        .required("Value is required")
        .matches(/^[0-9]+$/, "Value must be a number"),
    })
    .nullable(),
  minimum_order: yup
    .object()
    .shape({
      unit: yup.string().required("Unit is required"),
      value: yup
        .string()
        .required("Value is required")
        .matches(/^[0-9]+$/, "Value must be a number"),
    })
    .nullable(),
  packaging_type: yup
    .object()
    .shape({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .when("$isEditMode", {
      is: false,
      then: (schema) => schema.required("Packaging is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  relevant_documents: yup.array().of(yup.string().max(255)).default([]),
  year_of_origin: yup.string().max(255).nullable(),
  place_of_origin: yup.string().max(255).nullable(),
  land_mark: yup.string().max(255).nullable(),
  delivery_date: yup.date().nullable(),
  productVerified: yup.boolean().default(false),
});

interface ProductFormProps {
  id?: string; // Optional for edit mode
  onClose?: () => void;
}

function ProductForm({ id, onClose }: ProductFormProps) {
  const isEditMode = !!id;
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const { data, isLoading: isLoadingProduct } = useGetProductQuery({ id }, { skip: !id });
  const productData = data?.data;
  const { loginResponse } = useUserSlice();
  const creator_id = loginResponse?.user.id;

  const { data: users, isLoading: loadingUsers } = useGetUsersQuery({ limit: 500 });

  const [uploadsFile] = useUploadsFileMutation();

  const defaultValues = useMemo(
    () => ({
      title: productData?.title || "",
      packaging_type: isEditMode
        ? null
        : productData?.packaging_type
        ? { label: productData.packaging_type, value: productData.packaging_type }
        : { label: "", value: "" },
      category: productData?.category
        ? { label: productData.category, value: productData.category }
        : { label: "", value: "" },
      description: productData?.description || "",
      creatorId: productData?.creatorId,
      thumbnail: productData?.thumbnail || null,
      tags: productData?.tags || [],
      certifications: productData?.certifications || null,
      documents: productData?.documents || [],
      images: productData?.images || [],
      specification: productData?.specification || null,
      supply_capacity: productData?.supply_capacity || { unit: "", value: "" },
      minimum_order: productData?.minimum_order || { unit: "", value: "" },
      relevant_documents: productData?.relevant_documents || [],
      year_of_origin: productData?.year_of_origin || null,
      place_of_origin: productData?.place_of_origin || null,
      land_mark: productData?.land_mark || null,
      productVerified: productData?.productVerified || false,
    }),
    [productData, isEditMode]
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
    values: productData
      ? {
          ...productData,
          category: productData.category
            ? { label: productData.category, value: productData.category }
            : { label: "", value: "" },
          creatorId: { label: productData.creatorId, value: productData.creatorId },
          packaging_type: isEditMode
            ? null
            : productData.packaging_type
            ? { label: productData.packaging_type, value: productData.packaging_type }
            : { label: "", value: "" },
          supply_capacity: productData.supply_capacity || { unit: "", value: "" },
          minimum_order: productData.minimum_order || { unit: "", value: "" },
        }
      : undefined,
    context: { isEditMode },
  });

  const processSubmit = async (formData: any) => {
    try {
      const payload = {
        ...formData,
        category: formData.category.value,
        creatorId: creator_id,
        packagingType: formData.packaging_type?.value,
        //  confrim label name
        ownerId: formData.creatorId?.value,
        tags: formData.tags || [],
        produtVerified: formData.productVerified,
        documents: formData.documents || [],
        images: formData.images || [],
        relevant_documents: formData.relevant_documents || [],
        supply_capacity:
          formData.supply_capacity.unit && formData.supply_capacity.value
            ? { unit: formData.supply_capacity.unit, value: formData.supply_capacity.value }
            : null,
        minimum_order:
          formData.minimum_order.unit && formData.minimum_order.value
            ? { unit: formData.minimum_order.unit, value: formData.minimum_order.value }
            : null,
      };

      if (!isEditMode) {
        delete payload.id;
      }

      if (isEditMode) {
        await updateProduct({ id, data: payload })
          .unwrap()
          .then(() => {
            if (onClose) {
              onClose();
            }
          });
      } else {
        await createProduct(payload)
          .unwrap()
          .then(() => {
            if (onClose) {
              onClose();
            }
          });
      }
    } catch (error) {
      console.error(isEditMode ? "Failed to update product:" : "Failed to create product:", error);
    }
  };

  const isSubmitDisabled = isCreating || isUpdating;

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      {isLoadingProduct ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Details */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Product Details</h3>
              <div className="space-y-4">
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Product Title"
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
                        label="Product Owner"
                        isLoading={loadingUsers}
                        error={errors.creatorId?.value?.message}
                        options={users?.data.map((cat) => ({
                          label: cat.firstName + " " + cat.lastName,
                          value: cat.id,
                        }))}
                        required
                        value={field.value}
                        onSelectChange={(option) => field.onChange(option)}
                      />
                    )}
                  />
                )}

                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="select"
                      label="Category"
                      error={errors.category?.value?.message}
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
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="textarea"
                      label="Description"
                      error={errors.description?.message}
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
                  productData={productData}
                  fieldName="thumbnail"
                  isMultiple={false}
                  label="Product Thumbnail"
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

            {/* Additional Information */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Additional Information</h3>
              <div className="space-y-4">
                <Controller
                  name="certifications"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="text"
                      label="Certifications"
                      error={errors.certifications?.message}
                      value={value || ""}
                      onChange={onChange}
                      {...field}
                    />
                  )}
                />

                <FileUploader
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  uploadsFile={uploadsFile}
                  productData={productData}
                  arrayFieldName="images"
                  isMultiple={true}
                  maxFiles={3}
                  label="Product Images (Maximum 3)"
                  accept="image/*"
                />

                <Controller
                  name="specification"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="textarea"
                      label="Specification"
                      error={errors.specification?.message}
                      value={value || ""}
                      onChange={onChange}
                      {...field}
                    />
                  )}
                />

                {!isEditMode && (
                  <Controller
                    name="packaging_type"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        type="select"
                        label="Packaging Type"
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

                <div>
                  <FileUploader
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    uploadsFile={uploadsFile}
                    productData={productData}
                    arrayFieldName="documents"
                    isMultiple={true}
                    maxFiles={3}
                    label="Documents (Maximum 3)"
                    accept="image/*"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Supply Details */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Supply Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Supply Capacity</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="supply_capacity.unit"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="select"
                        label="Unit"
                        error={errors.supply_capacity?.unit?.message}
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
                    name="supply_capacity.value"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="text"
                        label="Value"
                        error={errors.supply_capacity?.value?.message}
                        required
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Minimum Order</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="minimum_order.unit"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="select"
                        label="Unit"
                        error={errors.minimum_order?.unit?.message}
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
                    name="minimum_order.value"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="text"
                        label="Value"
                        error={errors.minimum_order?.value?.message}
                        required
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Origin Details */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Origin Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Controller
                name="year_of_origin"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    type="text"
                    label="Year of Origin"
                    error={errors.year_of_origin?.message}
                    value={value || ""}
                    onChange={onChange}
                    {...field}
                  />
                )}
              />

              <Controller
                name="place_of_origin"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    type="text"
                    label="Place of Origin"
                    error={errors.place_of_origin?.message}
                    value={value || ""}
                    onChange={onChange}
                    {...field}
                  />
                )}
              />

              <Controller
                name="land_mark"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    type="text"
                    label="Landmark"
                    error={errors.land_mark?.message}
                    value={value || ""}
                    onChange={onChange}
                    {...field}
                  />
                )}
              />
            </div>
            <FileUploader
              control={control}
              watch={watch}
              setValue={setValue}
              uploadsFile={uploadsFile}
              productData={productData}
              arrayFieldName="relevant_documents"
              isMultiple={true}
              maxFiles={3}
              label="Relevant Documents (Maximum 3)"
              accept="/*"
            />
          </div>

          {/* Product Status */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Product Status</h3>
            <div className="flex items-center space-x-3">
              <Controller
                name="productVerified"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-0"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    <span>Product Verified</span>
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
              {isEditMode ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

export default ProductForm;
/* 
  todo : product owner name + company 
  todo : selloffer owner name + company 
  todo : update sell offer after selecting seller populate name + company 

*/
