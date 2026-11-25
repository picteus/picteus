import { ReactElement } from "react";
import { Flex, SegmentedControl, Text } from "@mantine/core";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CatalogViewModeType } from "types";
import Common from "../Common/Common.ts";


type ViewModeSwitchPropsType = {
  readonly value: CatalogViewModeType;
  readonly onChange: (viewMode: CatalogViewModeType) => void;
};

export default function ViewModeSwitch({ value, onChange }: ViewModeSwitchPropsType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <SegmentedControl
      value={value}
      onChange={selectedValue => onChange(selectedValue as CatalogViewModeType)}
      data={[
        {
          value: "cards",
          label: (
            <Flex gap={6} align="center">
              <IconLayoutGrid size={16} stroke={Common.IconStrokeSize}/>
              <Text size="sm">{t("viewMode.cards")}</Text>
            </Flex>
          )
        },
        {
          value: "list",
          label: (
            <Flex gap={6} align="center">
              <IconList size={16} stroke={Common.IconStrokeSize}/>
              <Text size="sm">{t("viewMode.list")}</Text>
            </Flex>
          )
        }
      ]}
    />
  );
}
