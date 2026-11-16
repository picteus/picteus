import { ReactElement, ReactNode } from "react";
import { Box, Flex, Text } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { shortenPath } from "utils";
import { useExtensionDisplayName } from "app/hooks";
import { RepositoriesService } from "app/services";
import { Common, ExtensionIcon } from "app/components";


type RepositoryIdentityType = {
  repository: Repository;
  menu?: ReactNode;
  subtitle?: string;
};

export default function RepositoryIdentity({ repository, menu, subtitle }: RepositoryIdentityType): ReactElement
{
  const [ t ] = useTranslation();
  const extensionDisplayName = useExtensionDisplayName(repository.extensionId);

  const source = subtitle ?? (RepositoriesService.isFromExtension(repository) === true
    ? t("repositoryScreen.addedBy", { name: extensionDisplayName ?? repository.extensionId })
    : shortenPath(repository.url));

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
        {RepositoriesService.isFromExtension(repository) === true
          ? <ExtensionIcon idOrExtension={repository.extensionId!} size="md"/>
          : <IconFolder size={Common.IconMediumSize} stroke={Common.IconStrokeSize}/>}
      </Flex>
      <Box flex={1} miw={0}>
        <Text size="sm" fw={500} truncate>{repository.name}</Text>
        <Text size="xs" c="dimmed" truncate>{source}</Text>
      </Box>
      {menu}
    </Flex>
  );
}
