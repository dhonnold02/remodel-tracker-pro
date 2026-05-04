import { toast, type ExternalToast } from "sonner";

const SUCCESS_DURATION = 4000;
const ERROR_DURATION = 6000;
const INFO_DURATION = 4000;

const baseOptions = { richColors: true } as const;

type Detail = string | ExternalToast | undefined;

const normalize = (detail: Detail): ExternalToast =>
  typeof detail === "string" ? { description: detail } : detail || {};

export const showSuccess = (message: string, detail?: Detail) =>
  toast.success(message, {
    ...baseOptions,
    duration: SUCCESS_DURATION,
    ...normalize(detail),
  });

export const showError = (message: string, detail?: Detail) =>
  toast.error(message, {
    ...baseOptions,
    duration: ERROR_DURATION,
    ...normalize(detail),
  });

export const showInfo = (message: string, detail?: Detail) =>
  toast(message, {
    ...baseOptions,
    duration: INFO_DURATION,
    ...normalize(detail),
  });