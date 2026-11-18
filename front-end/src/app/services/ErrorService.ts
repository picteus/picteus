export interface ApiCallError
{
  response: Response;
}

function isApiCallError(error: unknown): error is ApiCallError
{
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as ApiCallError).response?.clone === "function"
  );
}

async function extractErrorReason(error: unknown): Promise<string>
{
  if (isApiCallError(error))
  {
    try
    {
      const clonedResponse = error.response.clone();
      const jsonError = await clonedResponse.json();
      if (typeof jsonError?.message === "string" && jsonError.message !== "")
      {
        return jsonError.message;
      }
      return error.response.statusText || (error instanceof Error ? error.message : "");
    }
    catch
    {
      return error.response.statusText || (error instanceof Error ? error.message : "");
    }
  }
  if (error instanceof Error)
  {
    return error.message;
  }
  if (typeof error === "string")
  {
    return error;
  }
  return "";
}

export default {
  extractErrorReason
};
