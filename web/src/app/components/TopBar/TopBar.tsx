import style from "./TopBar.module.scss";

export default function TopBar({setZIndex, children }) {
  return (
    <div className={style.topBar} style={{ zIndex: setZIndex === true ? 1 : undefined }}>
      <div className={style.container}>{children}</div>
    </div>
  );
}
