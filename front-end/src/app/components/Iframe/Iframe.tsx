import style from "./Iframe.module.scss";


type IframeType = { content: { url: string } | { html: string } };

export default function Iframe({ content }: IframeType) {
  return <iframe className={style.iframe} {...{
    src: "url" in content ? content.url : undefined,
    srcDoc: "html" in content ? content.html : undefined
  }} />;
}
