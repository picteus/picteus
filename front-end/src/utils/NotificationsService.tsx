import React, { ReactNode } from "react";
import { Notification } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { toast as ReactToast } from "react-toastify";
import i18n from "i18next";


function success(description: string)
{
  return ReactToast(
    <Notification
      icon={<IconCheck/>}
      color="teal"
      title={i18n.t("message.toastSuccessTitle")}
    >
      {description}
    </Notification>
  );
}

function apiCallError(error: { response: Response }, message?: string): void
{
  error.response.json().then((jsonError) => withMessage(message !== undefined ? `${message}. Reason: '${jsonError.message}'` : jsonError.message));
}

function apiCallI18nError(error: { response: Response }, mnemonic: string): void
{
  error.response.json().then((jsonError) => withMessage(i18n.t(mnemonic, { error: jsonError.message })));
}

function errorWithMessage(error: Error, message?: string): void
{
  withMessage(message !== undefined ? `${message}. Reason: '${error.message}'` : error.message);
}

function withMessage(description: string): void
{
  ReactToast(
    <Notification
      icon={<IconX/>}
      color="red"
      title={i18n.t("message.toastErrorTitle")}
      mt="md"
    >
      {description}
    </Notification>
  );
}

function toast(component: ReactNode)
{
  const id = "event";
  const existingToast = ReactToast.isActive(id);
  const options = { position: "top-center" as const, toastId: id };
  if (existingToast)
  {
    return ReactToast.update(id, { render: component, ...options });
  }
  else
  {
    return ReactToast(component, options);
  }
}

export default {
  success,
  apiCallError,
  apiCallI18nError,
  errorWithMessage,
  withMessage,
  toast
};
