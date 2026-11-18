import { type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Alert, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useModalContext } from "app/context";
import Common from "../Common/Common.ts";


export type ModalErrorPropsType =
  {
    readonly error?: string;
    readonly title?: string;
    readonly onClose?: () => void;
  };

export default function ModalError({
  error,
  title,
  onClose
}: ModalErrorPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();

  if (error === undefined)
  {
    return null;
  }

  const isInline = modalContext?.errorElement === null || modalContext?.errorElement === undefined;
  const alert = (
    <Alert
      color="red"
      variant="light"
      radius={6}
      p="sm"
      mt={isInline ? "md" : undefined}
      mb={isInline ? "md" : undefined}
      title={title === undefined ? t("titles.error") : title}
      icon={<IconAlertCircle size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
      withCloseButton={onClose !== undefined}
      onClose={onClose}
    >
      <Text fz={13} lh={1.45} c="inherit">
        {error}
      </Text>
    </Alert>
  );

  if (modalContext?.errorElement)
  {
    return createPortal(alert, modalContext.errorElement);
  }

  return alert;
}
