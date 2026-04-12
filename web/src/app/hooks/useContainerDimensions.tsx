import { RefObject, useEffect, useState } from "react";


export default function useContainerDimensions(containerRef: RefObject<HTMLDivElement>): { width?: number, height?: number } {
  const [dimensions, setDimensions] = useState<{ width?: number, height?: number }>({ width: containerRef.current?.clientWidth, height: containerRef.current?.clientHeight });

  const debounce = (func, delay) => {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleResize = debounce(() => {
        if (containerRef?.current) {
          setDimensions({ width: container.clientWidth, height: container.clientHeight });
        }
      }, (100 / 60));
      window.addEventListener("resize", handleResize);
      if (containerRef?.current) {
        setDimensions({ width: container.clientWidth, height: container.clientHeight });
      }
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [containerRef?.current]);

  return dimensions;
}
