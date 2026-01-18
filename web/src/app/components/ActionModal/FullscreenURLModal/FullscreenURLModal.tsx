import style from "./FullscreenURLModal.module.scss";

export default function FullscreenURLModal({ url }: { url: string }) {
  return <iframe className={style.iframe} src={url} />;
}
