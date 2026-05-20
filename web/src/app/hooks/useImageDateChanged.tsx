import { useMemo, useRef } from "react";

import { ImageOrSummary } from "types";


export default function useImageDateChanged(image: ImageOrSummary): boolean {
  const initialImageDateRef = useRef<number>(image.fileDates?.modificationDate ?? image.modificationDate);
  const initialIdRef = useRef<string>(image.id);
  return useMemo<boolean>(() => {
    if (image.id === initialIdRef.current) {
      return (image.fileDates?.modificationDate ?? image.modificationDate) !== initialImageDateRef.current;
    } else {
      initialIdRef.current = image.id;
      initialImageDateRef.current = image.fileDates?.modificationDate ?? image.modificationDate;
      return false;
    }
  }, [image]);
}
