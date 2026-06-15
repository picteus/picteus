import { useTranslation } from "react-i18next";
import { Flex, Text, Tooltip } from "@mantine/core";

import style from "./CaptionDistance.module.scss";

export default function CaptionDistance({ distance }: { distance: number }) {
  const [t] = useTranslation();
  return (
    <Flex justify="space-between" className={style.container}>
      <Text fw={700} size="sm">
        {t("field.distance")}
      </Text>
      <Tooltip label={distance}>
        <Text size="sm" data-value={distance}>
          {distance.toFixed(4)}
        </Text>
      </Tooltip>
    </Flex>
  );
}
