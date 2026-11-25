import { type ReactElement, type ReactNode } from "react";
import { Box, Flex, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { type Repository } from "@picteus/ws-client";

import { shortenPath } from "utils";
import { useExtensionDisplayName } from "app/hooks";
import { RepositoriesService } from "app/services";
import IconTile from "../IconTile/IconTile.tsx";
import RepositoryIcon from "../RepositoryIcon/RepositoryIcon.tsx";


type RepositoryIdentityBaseType = {
  readonly footer?: ReactNode;
  readonly subtitle?: string;
  readonly description?: string;
  readonly size?: "sm" | "md";
};

type RepositoryIdentityPropsType =
  RepositoryIdentityBaseType &
  (
    | {
      readonly repository: Repository;
      readonly name?: never;
      readonly url?: never;
    }
    | {
      readonly repository?: never;
      readonly name: string;
      readonly url: string;
    }
  );

export default function RepositoryIdentity(props: RepositoryIdentityPropsType): ReactElement
{
  const { footer, subtitle, description, size = "md" } = props;
  const [ t ] = useTranslation();
  const extensionDisplayName = useExtensionDisplayName(props.repository?.extensionId);

  const isFromExtension = props.repository !== undefined && RepositoriesService.isFromExtension(props.repository) === true;
  const name = props.repository !== undefined ? props.repository.name : props.name;
  const url = props.repository !== undefined ? props.repository.url : props.url;
  const source = subtitle ?? (isFromExtension === true && props.repository?.extensionId !== undefined
    ? t("repositoryScreen.addedBy", { name: extensionDisplayName ?? props.repository.extensionId })
    : shortenPath(url));
  const isCompact = size === "sm";

  return (
    <Flex gap={isCompact === true ? "xs" : "sm"} align="center" wrap="nowrap" miw={0} flex={1}>
      <IconTile
        size={isCompact === true ? 32 : 40}
        isBordered={false}
        bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
      >
        <RepositoryIcon repository={props.repository} size={isCompact === true ? "sm" : "md"}/>
      </IconTile>
      <Box flex={1} miw={0}>
        <Text size="sm" fw={500} truncate>{name}</Text>
        <Text size="xs" c="dimmed" truncate>{source}</Text>
        {description && (
          <Text size="xs" c="dimmed" truncate>{description}</Text>
        )}
      </Box>
      {footer}
    </Flex>
  );
}
