import process from "node:process";


export interface CustomAuthContext
{
  headers: Record<string, string>;
  queryParams: Record<string, unknown>;
  toolName: string;
  definition: {
    name: string;
    method: string;
    pathTemplate: string;
    securityRequirements: Record<string, string[]>[];
  };
}

/**
 * Handles Picteus OpenAPI endpoints marked with TSOA `@Security("none")`
 * (emitted as `security: [{"none": []}]`) as well as instances running
 * without an API key configured.
 */
export async function applyCustomAuth(context: CustomAuthContext): Promise<boolean>
{
  const requirements = context.definition.securityRequirements;
  if (Array.isArray(requirements) && requirements.some((requirement) => "none" in requirement && Object.keys(requirement).length === 1))
  {
    return true;
  }
  const apiKey = process.env["API_KEY_API_KEY"];
  return apiKey === undefined || apiKey.length === 0;

}
