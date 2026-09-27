import { type ReactElement, type ReactNode } from "react";
import { Divider, Flex, Image, Stack, Title } from "@mantine/core";

import { computeResourceTypeUrl, ContentIconType } from "types";
import { Common } from "app/components";


type ContentTitleType = {
  text: string;
  icon?: ContentIconType;
  details?: ReactNode;
};

export default function ContentTitle({
  text,
  icon,
  details
}: ContentTitleType): ReactElement
{
  const titleContent = (
    <Flex gap="sm">
      {(icon !== undefined && ("url" in icon || "content" in icon)) && (
        <Image
          src={computeResourceTypeUrl(icon)}
          fallbackSrc={Common.FallbackImageUrl}
          h={Common.IconLargeSize}
          w={Common.IconLargeSize}
        />
      )}
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
