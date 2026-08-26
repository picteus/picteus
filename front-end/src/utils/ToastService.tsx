import React from "react";
import { Notification } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { toast, ToastContent, ToastOptions } from "react-toastify";
import { IconCancel, IconCheck, IconX } from "@tabler/icons-react";
import i18n from "i18next";

import { Common } from "app/components";


function withTitleAndSubtitle(type: "info" | "cancel" | "error", title: string, subtitle?: string): void
{
  const isInfo = type === "info";
  const isCancel = type === "cancel";
  const id = randomId();
  const options = { position: "bottom-center" as const, toastId: id, closeOnClick: true };
  triggerToast(({ closeToast }) => (
    <Notification
      icon={isInfo ? <IconCheck size={Common.ToastIconEdge}/> : (isCancel ? <IconCancel size={Common.ToastIconEdge}/> :
        <IconX size={Common.ToastIconEdge}/>)}
      color={isInfo ? "teal" : (isCancel ? "orange" : "red")}
      title={title}
      onClose={closeToast}
      onClick={closeToast}
      withBorder
    >
      {subtitle}
    </Notification>
  ), options, id);
}

function success(subtitle?: string): void
{
  return withTitleAndSubtitle("info", i18n.t("message.toastSuccessTitle"), subtitle);
}

function cancel(subtitle?: string): void
{
  return withTitleAndSubtitle("cancel", i18n.t("message.toastCancelTitle"), subtitle);
}

function failure(subtitle?: string): void
{
  return withTitleAndSubtitle("error", i18n.t("message.toastFailureTitle"), subtitle);
}

function failureAndMessage(error: Error, message?: string): void
{
  failure(message !== undefined ? `${message}. Reason: '${error.message}'` : error.message);
}

export interface ApiCallError
{
  response: Response;
}

function apiCallError(error: ApiCallError, message?: string): void
{
  error.response.json().then((jsonError) => failure(message !== undefined ? `${message}. Reason: '${jsonError.message}'` : jsonError.message));
}

function apiCallI18nError(error: ApiCallError, mnemonic: string): void
{
  error.response.json().then((jsonError) => failure(i18n.t(mnemonic, { error: jsonError.message })));
}

function triggerToast(content: ToastContent, options: ToastOptions, id: string): () => void
{
  const existingToast = toast.isActive(id);
  const fullOptions =
    {
      ...options,
      style: { backgroundColor: "transparent", boxShadow: "none", padding: 0 },
      closeButton: false
    };
  if (existingToast)
  {
    toast.update(id, { render: content, ...fullOptions });
  }
  else
  {
    toast(content, fullOptions);
  }
  return () =>
  {
    toast.dismiss(id);
  };
}

export default {
  withTitleAndSubtitle,
  success,
  cancel,
  failure,
  failureAndMessage,
  apiCallError,
  apiCallI18nError,
  triggerToast
};
