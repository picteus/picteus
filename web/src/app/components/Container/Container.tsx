import style from "./Container.module.scss";
import { ReactNode } from "react";

export default function Container({ children }: { children: ReactNode }) {
  return <div className={style.container}>{children}</div>;
}
