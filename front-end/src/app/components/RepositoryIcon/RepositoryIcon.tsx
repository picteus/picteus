import { type ReactElement } from "react";

import { type Repository } from "@picteus/ws-client";

import { type IconSizeType } from "types";
import { RepositoriesService } from "app/services";
import { EntityIcons } from "../AppIcons/AppIcons.ts";
import Common from "../Common/Common.ts";
import ExtensionIcon from "../ExtensionIcon/ExtensionIcon.tsx";


type RepositoryIconPropsType = {
  readonly repository?: Repository;
  readonly size?: IconSizeType;
};

export default function RepositoryIcon({
  repository,
  size = "xs"
}: RepositoryIconPropsType): ReactElement
{
  const isFromExtension = repository !== undefined && RepositoriesService.isFromExtension(repository) === true;

  if (isFromExtension === true && repository.extensionId !== undefined)
  {
    return <ExtensionIcon idOrExtension={repository.extensionId} size={size}/>;
  }

  const RepositorySvgIcon = EntityIcons.repository;

  return (
    <RepositorySvgIcon
      size={Common.IconFromStringToNumberSize(size)}
      stroke={Common.IconStrokeSize}
      style={{ flexShrink: 0 }}
    />
  );
}
