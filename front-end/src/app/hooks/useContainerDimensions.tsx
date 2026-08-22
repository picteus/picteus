import { RefObject, useEffect, useState } from "react";


type DimensionsType = { width?: number, height?: number };

export default function useContainerDimensions(containerRef: RefObject<HTMLElement>): DimensionsType
{
  const getDimensions = (container: HTMLElement | null): DimensionsType =>
  {
    if (!container)
    {
      return { width: undefined, height: undefined };
    }

    const computedStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    const marginX = parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight);
    const marginY = parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom);
    return {
      width: container.clientWidth - paddingX - marginX,
      height: container.clientHeight - paddingY - marginY
    };
  };

  const [ dimensions, setDimensions ] = useState<DimensionsType>(getDimensions(containerRef.current));

  const debounce = (theFunction: () => void, delay: number): () => void =>
  {
    let timer: any;
    return function (this: any, ...args: any[])
    {
      clearTimeout(timer);
      timer = setTimeout(() => theFunction.apply(this, args), delay);
    };
  };

  useEffect(() =>
  {
    const container = containerRef.current;
    if (container)
    {
      const handleResize = debounce(() =>
      {
        if (containerRef?.current)
        {
          setDimensions(getDimensions(containerRef.current));
        }
      }, (100 / 60));
      window.addEventListener("resize", handleResize);
      if (containerRef?.current)
      {
        setDimensions(getDimensions(containerRef.current));
      }
      return () =>
      {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [ containerRef?.current ]);

  return dimensions;
}
