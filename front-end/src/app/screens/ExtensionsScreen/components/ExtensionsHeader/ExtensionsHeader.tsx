import { ReactElement } from "react";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Common, ScreenHeader } from "app/components";


type ExtensionsHeaderPropsType = {
  readonly extensionsCount: number;
  readonly onCreateExtension: () => void;
  readonly onInstallExtension: () => void;
};

export default function ExtensionsHeader({
  extensionsCount,
  onCreateExtension,
  onInstallExtension
}: ExtensionsHeaderPropsType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <ScreenHeader
      title={t("extensionsScreen.title")}
      countLabel={t("extensionsScreen.extensionsCount", { count: extensionsCount })}
      subtitle={t("extensionsScreen.subtitle")}
      actions={(
        <>
          <Button
            variant="default"
            onClick={onCreateExtension}
          >
            {t("extensionsScreen.createExtension")}
          </Button>
          <Button
            leftSection={<IconPlus size={18} stroke={Common.IconStrokeSize}/>}
            onClick={onInstallExtension}
          >
            {t("extensionsScreen.installExtension")}
          </Button>
        </>
      )}
    />
  );
}
