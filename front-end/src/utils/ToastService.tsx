import React, { ReactNode } from "react";
import { Notification } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import i18n from "i18next";
import { toast as ReactToast } from "react-toastify";


function withTitleAndSubtitle(type: "info" | "error", title: string, subtitle: string): void
{
  const isInfo = type === "info";
  ReactToast(
    <Notification
      icon={isInfo ? <IconCheck/> : <IconX/>}
      color={isInfo ? "teal" : "red"}
      title={title}
      mt="md"
    >
      {subtitle}
    </Notification>
  );
}

function success(subtitle: string): void
{
  return withTitleAndSubtitle("info", i18n.t("message.toastSuccessTitle"), subtitle);
}

function failure(subtitle: string): void
{
  return withTitleAndSubtitle("error", i18n.t("message.toastErrorTitle"), subtitle);
}

function failureAndMessage(error: Error, message?: string): void
{
  failure(message !== undefined ? `${message}. Reason: '${error.message}'` : error.message);
}

function apiCallError(error: { response: Response }, message?: string): void
{
  error.response.json().then((jsonError) => failure(message !== undefined ? `${message}. Reason: '${jsonError.message}'` : jsonError.message));
}

function apiCallI18nError(error: { response: Response }, mnemonic: string): void
{
  error.response.json().then((jsonError) => failure(i18n.t(mnemonic, { error: jsonError.message })));
}

function toast(component: ReactNode): void
{
  const id = "event";
  const existingToast = ReactToast.isActive(id);
  const options = { position: "top-center" as const, toastId: id };
  if (existingToast)
  {
    ReactToast.update(id, { render: component, ...options });
  }
  else
  {
    ReactToast(component, options);
  }
}

export default {
  withTitleAndSubtitle,
  success,
  failure,
  failureAndMessage,
  apiCallError,
  apiCallI18nError,
  toast
};
