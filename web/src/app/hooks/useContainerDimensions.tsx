import { useEffect, useState } from "react";

export default function useContainerDimensions(containerRef): { width: number, height: number } {
  const [dimensions, setDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });

  const debounce = (func, delay) => {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  };

  useEffect(() => {
    if (containerRef.current) {
      const handleResize = debounce(() => {
        if (containerRef?.current) {
          setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
        }
      }, (100 / 60) * 5);
      window.addEventListener("resize", handleResize);
      if (containerRef?.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [containerRef?.current]);

  return { width: dimensions.width, height: dimensions.height };
}
