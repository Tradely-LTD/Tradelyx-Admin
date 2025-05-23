//@ts-nocheck
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "@/common/input/input";
import Button from "@/common/button/button";
import { useGetUserProfileQuery, useUpdateUserMutation } from "../user-api";
import { Loader } from "@/common/loader/loader";

// Validation schema using Yup
const validationSchema = yup.object({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  email: yup.string().email("Invalid email format").required("Email is required"),
  phoneNo: yup
    .string()
    .required("Phone number is required")
    .matches(/^[0-9+-]+$/, "Phone number can only contain numbers, + and -"),
  roles: yup.object().required("Role is required"),
  streetAddress: yup.string().nullable(),
  city: yup.string().nullable(),
  state: yup.string().nullable(),
  LGA: yup.string().nullable(),
  zipCode: yup
    .string()
    .nullable()
    .matches(/^[0-9-]*$/, "Zip code must contain only numbers and hyphens"),
  operatingCountry: yup.string().nullable(),
  isVerified: yup.boolean(),
});

function UserForm({ id, onClose }: { id: string; onClose?: () => void }) {
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const { data, isLoading: isLoadingUser } = useGetUserProfileQuery({ id }, { skip: !id });
  const userData = data?.data;

  const defaultValues = {
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    email: userData?.email || "",
    phoneNo: userData?.phoneNo || "",
    roles: userData?.roles || "buyer",
    streetAddress: userData?.streetAddress || null,
    city: userData?.city || null,
    state: userData?.state || null,
    LGA: userData?.LGA || null,
    zipCode: userData?.zipCode || null,
    operatingCountry: userData?.operatingCountry || null,
    isVerified: userData?.isVerified || false,
    id: userData?.id || "",
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues,
    values: userData
      ? {
          ...userData,

          roles: {
            value: userData.roles,
            label: userData.roles,
          },
        }
      : undefined,
  });

  const processSubmit = (formData) => {
    const {
      createdAt,
      updatedAt,
      isKYCCompleted,
      roles,
      profileImage,
      deviceToken,
      isCompany,
      ...rest
    } = formData;

    try {
      updateUser({
        id,
        data: { ...rest, roles: roles.value },
      })
        .unwrap()
        .then(() => {
          if (onClose) {
            onClose();
          }
        });
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
      {isLoadingUser ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Information */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Personal Information</h3>
              <div className="space-y-3">
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="First Name"
                      error={errors.firstName?.message}
                      required
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Last Name"
                      error={errors.lastName?.message}
                      required
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="email"
                      label="Email Address"
                      error={errors.email?.message}
                      required
                      disabled={!!userData?.email}
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="phoneNo"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="tel"
                      label="Phone Number"
                      error={errors.phoneNo?.message}
                      required
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="roles"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="select"
                      label="Role"
                      error={errors.roles?.message}
                      options={[
                        { label: "Admin", value: "admin" },
                        { label: "Seller", value: "seller" },
                        { label: "Buyer", value: "buyer" },
                      ]}
                      required
                      value={field.value}
                      // selectedValue={field.value}
                      onSelectChange={(option) => field.onChange(option)}
                    />
                  )}
                />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Address Information</h3>
              <div className="space-y-3">
                <Controller
                  name="streetAddress"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="text"
                      label="Street Address"
                      error={errors.streetAddress?.message}
                      value={value || ""}
                      onChange={onChange}
                      {...field}
                    />
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="city"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Input
                        type="text"
                        label="City"
                        error={errors.city?.message}
                        value={value || ""}
                        onChange={onChange}
                        {...field}
                      />
                    )}
                  />

                  <Controller
                    name="state"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Input
                        type="text"
                        label="State"
                        error={errors.state?.message}
                        value={value || ""}
                        onChange={onChange}
                        {...field}
                      />
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="LGA"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Input
                        type="text"
                        label="LGA"
                        error={errors.LGA?.message}
                        value={value || ""}
                        onChange={onChange}
                        {...field}
                      />
                    )}
                  />

                  <Controller
                    name="zipCode"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Input
                        type="text"
                        label="Zip Code"
                        error={errors.zipCode?.message}
                        value={value || ""}
                        onChange={onChange}
                        {...field}
                      />
                    )}
                  />
                </div>

                <Controller
                  name="operatingCountry"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="text"
                      label="Operating Country"
                      error={errors.operatingCountry?.message}
                      value={value || ""}
                      disabled
                      onChange={onChange}
                      {...field}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Controller
                  name="isVerified"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-0"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                      <span>Account Active</span>
                    </label>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outlined" disabled={isUpdating} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating} loading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

export default UserForm;
