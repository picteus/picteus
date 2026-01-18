import { useEffect, useState } from "react";

export default function useContainerDimensions(containerRef) {
  const [containerWidth, setContainerWidth] = useState<number>();

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
        setContainerWidth(containerRef?.current?.clientWidth);
      }, 500);
      window.addEventListener("resize", handleResize);
      setContainerWidth(containerRef?.current?.clientWidth);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [containerRef?.current]);

  return containerWidth;
}
