import React, { ReactNode, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tooltip, UnstyledButton } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { Common } from "app/components";

import style from "./SidebarLink.module.scss";


interface SidebarLinkType
{
  icon: ReactNode;
  externalLink?: boolean;
  label: string;
  route: string;

  onClick?(): void;
}

export function SidebarLink({ icon, externalLink, label, route, onClick }: SidebarLinkType)
{
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const handleOnClick = useCallback(() =>
  {
    if (onClick)
    {
      onClick();
    }
    else
    {
      navigate(route);
    }
  }, [ onClick ]);

  return (
    <Tooltip label={label} position="right">
      <UnstyledButton
        onClick={handleOnClick}
        className={style.iconLink}
        size="md"
        data-active={pathname === route || undefined}
      >
        {icon}
        {externalLink === true &&
          <IconExternalLink className={style.externalLinkIcon} stroke={Common.IconStrokeSize} size={14}/>}
      </UnstyledButton>
    </Tooltip>
  );
}
