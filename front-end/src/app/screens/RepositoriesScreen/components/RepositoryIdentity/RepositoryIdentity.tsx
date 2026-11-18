import { ReactElement, ReactNode } from "react";
import { Box, Flex, Text } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { shortenPath } from "utils";
import { useExtensionDisplayName } from "app/hooks";
import { RepositoriesService } from "app/services";
import { Common, ExtensionIcon } from "app/components";


type RepositoryIdentityBaseType =
  {
    readonly footer?: ReactNode;
    readonly subtitle?: string;
  };

type RepositoryIdentityType =
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

export default function RepositoryIdentity(props: RepositoryIdentityType): ReactElement
{
  const { footer, subtitle } = props;
  const [ t ] = useTranslation();
  const extensionDisplayName = useExtensionDisplayName(props.repository?.extensionId);

  const isFromExtension = props.repository !== undefined && RepositoriesService.isFromExtension(props.repository) === true;
  const name = props.repository !== undefined ? props.repository.name : props.name;
  const url = props.repository !== undefined ? props.repository.url : props.url;
  const source = subtitle ?? (isFromExtension === true && props.repository?.extensionId !== undefined
    ? t("repositoryScreen.addedBy", { name: extensionDisplayName ?? props.repository.extensionId })
    : shortenPath(url));

  return (
    <Flex gap="sm" align="center" wrap="nowrap">
      <Flex
        w={40}
        h={40}
        align="center"
        justify="center"
        bg="gray.1"
        bdrs="sm"
        flex="0 0 auto"
      >
        {isFromExtension === true && props.repository?.extensionId !== undefined
          ? <ExtensionIcon idOrExtension={props.repository.extensionId} size="md"/>
          : <IconFolder size={Common.IconMediumSize} stroke={Common.IconStrokeSize}/>}
      </Flex>
      <Box flex={1} miw={0}>
        <Text size="sm" fw={500} truncate>{name}</Text>
        <Text size="xs" c="dimmed" truncate>{source}</Text>
      </Box>
      {footer}
    </Flex>
  );
}
