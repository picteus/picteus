import { type ReactElement } from "react";
import { Badge, Tooltip } from "@mantine/core";
import { IconFileTypography, IconPuzzle, IconTag, IconTextScan2, IconVectorTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ManifestCapability, ManifestCapabilityId } from "@picteus/ws-client";

import { Common } from "app/components";


type ExtensionCapabilityType = {
  capability: ManifestCapability;
};

const capabilityConfigMap: Record<
  ManifestCapabilityId,
  {
    translationKey: string;
    icon: typeof IconTag;
  }
> = {
  [ManifestCapabilityId.ImageFeatures]: {
    translationKey: "imageFeatures",
    icon: IconTextScan2
  },
  [ManifestCapabilityId.ImageTags]: {
    translationKey: "imageTags",
    icon: IconTag
  },
  [ManifestCapabilityId.ImageEmbeddings]: {
    translationKey: "imageEmbeddings",
    icon: IconVectorTriangle
  },
  [ManifestCapabilityId.TextEmbeddings]: {
    translationKey: "textEmbeddings",
    icon: IconFileTypography
  }
};

export default function ExtensionCapability({
  capability
}: ExtensionCapabilityType): ReactElement
{
  const { t } = useTranslation();

  const config = capabilityConfigMap[capability.id];
  const IconComponent = config?.icon ?? IconPuzzle;
  const label = config
    ? t(`extensionCapabilities.${config.translationKey}.label`)
    : capability.id;
  const description = config
    ? t(`extensionCapabilities.${config.translationKey}.description`)
    : capability.id;

  return (
    <Tooltip
      label={description}
      multiline
      w={250}
    >
      <Badge
        variant="outline"
        color="grape"
        tt="none"
        leftSection={<IconComponent size={Common.IconSmallSize}/>}
      >
        {label}
      </Badge>
    </Tooltip>
  );
}
