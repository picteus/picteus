import React, { ReactNode } from "react";
import { Alert, Notification, Stack, Text } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { toast, ToastContent, ToastOptions } from "react-toastify";
import { IconCancel, IconCheck, IconX } from "@tabler/icons-react";
import i18n from "i18next";

import { Common, CopyText } from "app/components";


function withTitleAndSubtitle(type: "info" | "cancel" | "warn" | "error", title: string, subtitle?: ReactNode): void
{
  const isInfo = type === "info";
  const isCancel = type === "cancel";
  const isWarn = type === "warn";
  const isErrorOrWarn = isWarn || type === "error";
  const id = randomId();
  const options: ToastOptions =
    {
      position: "bottom-center",
      toastId: id,
      closeOnClick: true,
      autoClose: isErrorOrWarn ? 5_000 : 3_000
    };
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

function internalFailure(subtitle?: ReactNode): void
{
  return withTitleAndSubtitle("error", i18n.t("message.toastFailureTitle"), subtitle);
}

function failure(subtitle?: string): void
{
  return internalFailure(subtitle);
}

function renderErrorBody(message?: string, reason?: string): ReactNode
{
  const hasMessage = message !== undefined && message.trim().length > 0;
  const hasReason = reason !== undefined && reason.trim().length > 0;

  if (hasMessage === false && hasReason === false)
  {
    return undefined;
  }

  return (
    <Stack gap={6} mt={4}>
      {hasMessage && (
        <Text size="sm" c="var(--mantine-color-text)" style={{ lineHeight: 1.35 }}>
          {message}
        </Text>
      )}
      {hasReason && (
        <Alert
          color="red"
          variant="light"
          p="xs"
          radius="xs"
          onClick={(event) =>
          {
            event.stopPropagation();
          }}
        >
          <CopyText value={reason}>
            <Text component="span" size="xs" style={{ wordBreak: "break-word", userSelect: "text" }}>
              {reason}
            </Text>
          </CopyText>
        </Alert>
      )}
    </Stack>
  );
}

async function extractErrorReason(error: ApiCallError): Promise<string>
{
  try
  {
    const clonedResponse = error.response.clone();
    const jsonError = await clonedResponse.json();
    return jsonError?.message ?? error.response.statusText ?? "";
  }
  catch
  {
    return error.response.statusText || "";
  }
}

function failureAndMessage(error: Error, message?: string): void
{
  internalFailure(renderErrorBody(message, error.message));
}

export interface ApiCallError
{
  response: Response;
}

function apiCallError(error: ApiCallError, message?: string): void
{
  extractErrorReason(error).then((reason) =>
    {
      internalFailure(renderErrorBody(message, reason));
    }
  );
}

function apiCallI18nError(error: ApiCallError, mnemonic: string, i18nArguments?: Record<string, string>): void
{
  extractErrorReason(error).then((reason) =>
    {
      // We extract the localized message and clean up any trailing colon or whitespace
      internalFailure(renderErrorBody(i18n.t(mnemonic, i18nArguments), reason));
    }
  );
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
