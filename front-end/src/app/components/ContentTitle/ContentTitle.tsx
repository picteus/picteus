import { type ReactElement, type ReactNode } from "react";
import { Divider, Flex, Stack, Title } from "@mantine/core";

import { ContentIconType } from "types";
import { ResourceIcon } from "app/components";


type ContentTitleType = {
  text: string;
  icon?: ContentIconType;
  details?: ReactNode;
};

export default function ContentTitle(props: ContentTitleType): ReactElement
{
  const { text, icon, details } = props;
  const titleContent = (
    <Flex gap="sm">
      <ResourceIcon icon={icon} isCompact={false}/>
      {(icon !== undefined && "icon" in icon) && icon.icon}
      <Title order={3}>{text}</Title>
    </Flex>
  );

  return (
    <Stack gap="xs" w="100%">
      {titleContent}
      {(details !== undefined && details !== null) && details}
      <Divider pos="absolute" left={0} right={0} bottom={0}/>
    </Stack>
  );
}
