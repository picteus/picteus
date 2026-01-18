import style from "./TopBar.module.scss";

export default function TopBar({ children }) {
  return (
    <div className={style.topBar}>
      <div className={style.container}>{children}</div>
    </div>
  );
}
