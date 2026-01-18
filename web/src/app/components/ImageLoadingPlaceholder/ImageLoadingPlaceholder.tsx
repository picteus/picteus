import style from "./ImageLoadingPlaceholder.module.scss";

export default function ImageLoadingPlaceholder({ width = 100, height = 100 }) {
  return (
    <div
      style={{ width: width + "px", height: height + "px" }}
      className={style.container}
    />
  );
}
