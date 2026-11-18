import { useCallback, useEffect, useRef, useState } from "react";

import { ErrorService } from "app/services";


export type UseModalSubmitResultType<TArgs extends unknown[] = []> =
  {
    readonly isSubmitting: boolean;
    readonly submitError: string | undefined;
    readonly clearSubmitError: () => void;
    readonly handleSubmit: (...args: TArgs) => Promise<void>;
  };

export default function useModalSubmit<TArgs extends unknown[] = []>(
  onSubmit: (...args: TArgs) => Promise<void>
): UseModalSubmitResultType<TArgs>
{
  const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);
  const [ submitError, setSubmitError ] = useState<string | undefined>();
  const isSubmittingRef = useRef<boolean>(false);
  const onSubmitRef = useRef<(...args: TArgs) => Promise<void>>(onSubmit);

  useEffect((): void =>
  {
    onSubmitRef.current = onSubmit;
  }, [ onSubmit ]);

  const clearSubmitError = useCallback((): void =>
  {
    setSubmitError(undefined);
  }, []);

  const handleSubmit = useCallback(async (...args: TArgs): Promise<void> =>
  {
    if (isSubmittingRef.current)
    {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(undefined);
    try
    {
      await onSubmitRef.current(...args);
    }
    catch (error)
    {
      const errorReason = await ErrorService.extractErrorReason(error);
      setSubmitError(errorReason);
    }
    finally
    {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    submitError,
    clearSubmitError,
    handleSubmit
  };
}
