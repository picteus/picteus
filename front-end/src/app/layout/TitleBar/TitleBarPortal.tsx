import { type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useTitleBarContext } from "app/context";


export interface TitleBarPortalPropsType
{
  readonly children: ReactNode;
}

export default function TitleBarPortal({ children }: TitleBarPortalPropsType): ReactElement | null
{
  const { titleBarElement } = useTitleBarContext();
  if (titleBarElement === null)
  {
    return null;
  }

  return createPortal(children, titleBarElement);
}
