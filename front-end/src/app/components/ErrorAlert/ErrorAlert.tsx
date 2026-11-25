import { type ReactElement } from "react";
import { Alert, Button, Group, MantineSpacing, Stack, StyleProp, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import Common from "../Common/Common.ts";


type ErrorAlertPropsType =
  {
    readonly title?: string;
    readonly message?: string;
    readonly onClose?: () => void;
    readonly onRetry?: () => void;
    readonly isRetrying?: boolean;
    readonly mt?: StyleProp<MantineSpacing>;
    readonly mb?: StyleProp<MantineSpacing>;
  };

export default function ErrorAlert({
  title,
  message,
  onClose,
  onRetry,
  isRetrying = false,
  mt,
  mb
}: ErrorAlertPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const hasMessage = message !== undefined && message.trim().length > 0;
  const hasRetry = onRetry !== undefined;

  return (
    <Alert
      color="red"
      variant="light"
      radius={6}
      p="sm"
      mt={mt}
      mb={mb}
      title={title === undefined ? t("titles.error") : title}
      icon={<IconAlertCircle size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
      withCloseButton={onClose !== undefined}
      onClose={onClose}
    >
      {hasRetry === true ? (
        <Stack gap="xs">
          {hasMessage === true && (
            <Text fz={13} lh={1.45} c="inherit">
              {message}
            </Text>
          )}
          <Group>
            <Button
              size="xs"
              variant="light"
              color="red"
              loading={isRetrying}
              onClick={onRetry}
            >
              {t("button.retry")}
            </Button>
          </Group>
        </Stack>
      ) : hasMessage === true ? (
        <Text fz={13} lh={1.45} c="inherit">
          {message}
        </Text>
      ) : null}
    </Alert>
  );
}
