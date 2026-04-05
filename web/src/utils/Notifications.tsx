import React, { ReactNode } from "react";
import { toast } from "react-toastify";
import { Notification } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import i18n from "i18next";

export function notifySuccess(description: string) {
  return toast(
    <Notification
      icon={<IconCheck />}
      color="teal"
      title={i18n.t("message.toastSuccessTitle")}
    >
      {description}
    </Notification>,
  );
}

export function notifyApiCallError(error: { response: Response }, message?: string): void {
  error.response.json().then((jsonError) => notifyError(message !== undefined ? `${message}. Reason: '${jsonError.message}'`: jsonError.message));
}

export function notifyApiCallI18nError(error: { response: Response }, mnemonic: string): void {
  error.response.json().then((jsonError) => notifyError(i18n.t(mnemonic, { error: jsonError.message })));
}

export function notifyErrorWithError(error: Error, message?: string): void {
  notifyError(message !== undefined ? `${message}. Reason: '${error.message}'` : error.message);
}

export function notifyError(description: string): void {
  toast(
    <Notification
      icon={<IconX />}
      color="red"
      title={i18n.t("message.toastErrorTitle")}
      mt="md"
    >
      {description}
    </Notification>,
  );
}

export function notifyEvent(component: ReactNode) {
  const existingToast = toast.isActive("event");

  const options = {
    position: "top-center" as const,
    toastId: "event",
  };
  if (existingToast) {
    return toast.update("event", { render: component, ...options });
  } else {
    return toast(component, options);
  }
}
