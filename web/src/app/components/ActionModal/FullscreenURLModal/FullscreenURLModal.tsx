import style from "./FullscreenURLModal.module.scss";

export default function FullscreenURLModal({ content }: { content: { url: string } | { html: string }}) {
  return <iframe className={style.iframe} {...{
    src: "url" in content ? content.url : undefined,
    srcDoc: "html" in content ? content.html : undefined
  }} />;
}
