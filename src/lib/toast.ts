import { toast } from "sonner";

const SUCCESS_DURATION = 4000;
const ERROR_DURATION = 6000;
const INFO_DURATION = 4000;

const baseOptions = { richColors: true } as const;

export const showSuccess = (message: string, description?: string) =>
  toast.success(message, {
    ...baseOptions,
    duration: SUCCESS_DURATION,
    description,
  });

export const showError = (message: string, description?: string) =>
  toast.error(message, {
    ...baseOptions,
    duration: ERROR_DURATION,
    description,
  });

export const showInfo = (message: string, description?: string) =>
  toast(message, {
    ...baseOptions,
    duration: INFO_DURATION,
    description,
  });