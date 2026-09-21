import { useMemo, useRef } from "react";

import { ImageOrSummary } from "types";


export default function useImageDateChanged(image: ImageOrSummary): { hasChanged: boolean, latestDate: number }
{
  const initialImageDateRef = useRef<number>(image.fileDates?.modificationDate ?? image.modificationDate);
  const initialIdRef = useRef<string>(image.id);
  return useMemo<{ hasChanged: boolean, latestDate: number }>(() =>
  {
    const latestDate = image.fileDates?.modificationDate ?? image.modificationDate;
    let hasChanged: boolean;
    if (image.id === initialIdRef.current)
    {
      const previousInitialImageDateRef = initialImageDateRef.current;
      initialImageDateRef.current = latestDate;
      hasChanged = latestDate !== previousInitialImageDateRef;
    }
    else
    {
      initialIdRef.current = image.id;
      initialImageDateRef.current = latestDate;
      hasChanged = false;
    }
    return { hasChanged, latestDate };
  }, [ image ]);
}
