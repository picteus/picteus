import { ReactElement } from "react";
import { Box, Text } from "@mantine/core";

import style from "../../ImagePicker.module.scss";


type ImagePickerEmptyStatePropsType = {
  readonly title: string;
  readonly description: string;
};

export default function ImagePickerEmptyState({
  title,
  description
}: ImagePickerEmptyStatePropsType): ReactElement
{
  return (
    <Box className={style.emptyState}>
      <Text size="md" fw={700} ta="center">
        {title}
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        {description}
      </Text>
    </Box>
  );
}
