import { type ReactElement, type ReactNode, useCallback } from "react";

import { useTitleBarContext } from "app/context";
import style from "./TitleBar.module.scss";


interface TitleBarPropsType
{
  readonly children?: ReactNode;
}

export default function TitleBar({ children }: TitleBarPropsType): ReactElement
{
  const { setTitleBarElement } = useTitleBarContext();

  const handleRef = useCallback((element: HTMLDivElement | null) =>
    {
      setTitleBarElement(element);
    },
    [ setTitleBarElement ]
  );

  return (
    <div className={style.titleBar}>
      <div ref={handleRef} className={style.content}>
        {children}
      </div>
    </div>
  );
}
