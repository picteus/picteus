import { Configuration } from "@picteus/ws-client";
import { ApiCallError } from "@picteus/internal-extension-sdk";

import { paths } from "../src/paths";


export class WebServicesWrapper
{

  private readonly _configuration: Configuration;

  constructor(apiKey: string | undefined)
  {
    this._configuration = new Configuration({
      basePath: paths.webServicesBaseUrl,
      apiKey,
      fetchApi: this.fetchApi
    });
  }

  get configuration()
  {
    return this._configuration;
  }

  async computeController<T>(controllerConstructor: new (configuration: Configuration) => T): Promise<T>
  {
    return new controllerConstructor(this._configuration);
  }

  private async fetchApi(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response>
  {
    const response = await fetch(input, init);
    if (response.status < 400)
    {
      return Promise.resolve(response);
    }
    let code: number = -1;
    let message: string;
    const contentType = response.headers.get("content-type");
    if (contentType !== null && contentType.includes("application/json") === true)
    {
      const json = await response.json();
      code = json.code;
      message = json.message;
    }
    else
    {
      // The result is not a JSON content
      message = await response.text();
    }
    return Promise.reject(new ApiCallError({ status: response.status, code, message }));
  }

}
