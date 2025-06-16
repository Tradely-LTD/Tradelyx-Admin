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
import { Loader } from "@/common/loader/loader";
import {
  useGetNotificationQuery,
  useCreateNotificationMutation,
  useUpdateNotificationMutation,
} from "../notification-api";
import { useUploadsFileMutation } from "@/store/uploads";

// Interface for the notification data
interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  thumbnail: string | null;
  createdAt?: string; // ISO date string, read-only
}

// Validation schema using Yup
const validationSchema = yup.object({
  // userId: yup.string().required("User ID is required").uuid("Must be a valid UUID"),
  title: yup
    .string()
    .required("Title is required")
    .max(255, "Title must be at most 255 characters"),
  message: yup
    .string()
    .required("Message is required")
    .max(1000, "Message must be at most 1000 characters"),
  thumbnail: yup.string().nullable().url("Must be a valid URL"),
});

interface NotificationFormProps {
  id?: string;
  onClose?: () => void;
}

function NotificationForm({ id, onClose }: NotificationFormProps) {
  const isEditMode = !!id;
  const [createNotification, { isLoading: isCreating }] = useCreateNotificationMutation();
  const [updateNotification, { isLoading: isUpdating }] = useUpdateNotificationMutation();
  const { data, isLoading: isLoadingNotification } = useGetNotificationQuery({ id }, { skip: !id });
  const [uploadsFile] = useUploadsFileMutation();

  // Map API response to Notification structure
  const notificationData = useMemo<Notification | undefined>(() => {
    if (!data?.data) return undefined;
    return {
      id: data.data.id,
      // userId: data.data.userId,
      title: data.data.title,
      message: data.data.message,
      thumbnail: data.data.thumbnail,
      createdAt: data.data.createdAt,
    };
  }, [data?.data]);

  // Define default values for the form
  const defaultValues = useMemo<Notification>(() => {
    let formattedDate = null;
    if (notificationData?.createdAt) {
      const date = new Date(notificationData.createdAt);
      if (!isNaN(date.getTime())) {
        formattedDate = format(date, "yyyy-MM-dd HH:mm");
      }
    }

    return {
      id: notificationData?.id,
      // userId: notificationData?.userId || "",
      title: notificationData?.title || "",
      message: notificationData?.message || "",
      thumbnail: notificationData?.thumbnail || null,
      createdAt: formattedDate,
    };
  }, [notificationData]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Notification>({
    resolver: yupResolver(validationSchema),
    defaultValues,
    values: notificationData ? defaultValues : undefined,
  });

  const processSubmit = async (formData: Notification) => {
    try {
      const payload: Notification = {
        userId: formData.userId,
        title: formData.title,
        message: formData.message,
        thumbnail: formData.thumbnail || null,
      };

      if (isEditMode && id) {
        await updateNotification({ id, data: payload })
          .unwrap()
          .then(() => {
            if (onClose) onClose();
          });
      } else {
        await createNotification({ data: payload })
          .unwrap()
          .then(() => {
            if (onClose) onClose();
          });
      }
    } catch (error) {
      console.error(
        isEditMode ? "Failed to update notification:" : "Failed to create notification:",
        error
      );
    }
  };

  const isSubmitDisabled = isCreating || isUpdating;

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      {isLoadingNotification ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {/* Notification Details */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Notification Details</h3>
              <div className="space-y-4">
                {/* <Controller
                  name="userId"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="User ID"
                      error={errors.userId?.message}
                      required
                      {...field}
                    />
                  )}
                /> */}
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      label="Title"
                      error={errors.title?.message}
                      required
                      {...field}
                    />
                  )}
                />
                <Controller
                  name="message"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="textarea"
                      label="Message"
                      error={errors.message?.message}
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
                  productData={notificationData}
                  fieldName="thumbnail"
                  isMultiple={false}
                  label="Thumbnail Image"
                  accept="image/*"
                />
              </div>
            </div>

            {/* Metadata (for edit mode) */}
            {isEditMode && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Metadata</h3>
                <div className="space-y-4">
                  <Controller
                    name="createdAt"
                    control={control}
                    render={({ field }) => (
                      <Input type="text" label="Created At" value={field.value ?? ""} disabled />
                    )}
                  />
                </div>
              </div>
            )}
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
              {isEditMode ? "Update Notification" : "Create Notification"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

export default NotificationForm;
