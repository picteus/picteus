import { ReactElement } from "react";
import { Badge, Flex, UnstyledButton } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ExtensionDerivedStatusType } from "app/services";
import StatusPill from "../StatusPill/StatusPill.tsx";


export const EXTENSION_STATUS_COLORS: Record<ExtensionDerivedStatusType, string> = {
  running: "green",
  starting: "blue",
  paused: "gray",
  error: "red",
  notInstalled: "gray",
  installing: "blue",
  updating: "blue"
};

type ExtensionStatusPillPropsType = {
  readonly status: ExtensionDerivedStatusType;
  readonly availableUpdateVersion: string | undefined;
  readonly onUpdateClick: (() => void) | undefined;
};

export default function ExtensionStatusPill({
  status,
  availableUpdateVersion,
  onUpdateClick
}: ExtensionStatusPillPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const color = EXTENSION_STATUS_COLORS[status];
  const isBusy = status === "installing" || status === "updating";
  const shouldShowUpdatePill = availableUpdateVersion !== undefined && status !== "updating" && status !== "installing";

  return (
    <Flex align="center" gap={6} wrap="wrap">
      <StatusPill
        label={t(`extension.status.${status}`)}
        color={color}
        isLoading={isBusy}
      />
      {shouldShowUpdatePill === true && (
        onUpdateClick !== undefined ? (
          <UnstyledButton
            onClick={event =>
            {
              event.stopPropagation();
              onUpdateClick();
            }}
            display="inline-flex"
          >
            <Badge
              color="blue"
              variant="light"
              size="sm"
              leftSection={<IconArrowUp size={12} stroke={2}/>}
              style={{ cursor: "pointer" }}
            >
              {t("extension.updatePill", { version: availableUpdateVersion })}
            </Badge>
          </UnstyledButton>
        ) : (
          <Badge
            color="blue"
            variant="light"
            size="sm"
            leftSection={<IconArrowUp size={12} stroke={2}/>}
          >
            {t("extension.updatePill", { version: availableUpdateVersion })}
          </Badge>
        )
      )}
    </Flex>
  );
}
