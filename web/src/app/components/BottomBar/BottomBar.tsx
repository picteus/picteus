import style from "./BottomBar.module.scss";
import { ReactNode } from "react";

export default function BottomBar({ children }: { children?: ReactNode }) {
  return (
    <div className={style.bottomBar}>
      {children}
      {/*<div className={style.eventInformation}>
        <EventInformation />
      </div>*/}
    </div>
  );
}
