import { URL } from "node:url";


export class NetworkSecurity
{

  static readonly instance = new NetworkSecurity();

  readonly localhost = "localhost";

  readonly allInterfacesIpAddress = "0.0.0.0";

  private readonly loopbackIpAddress = "127.0.0.1";

  private readonly desktopSchemes: string[] = [ "file://", "app://" ];

  private host?: string;

  private allowedOrigins?: string[];

  private webServerPortNumber?: number;

  private _computedAllowedOrigins?: string[];

  private _computedAllowedHosts?: Set<string>;

  private constructor()
  {
  }

  update(host: string, allowedOrigins: string[], webServerPortNumber: number): void
  {
    this.host = host;
    this.allowedOrigins = allowedOrigins;
    this.webServerPortNumber = webServerPortNumber;
    this._computedAllowedOrigins = undefined;
    this._computedAllowedHosts = undefined;
  }

  computeAllowedOrigins(): string[]
  {
    if (this._computedAllowedOrigins === undefined || this._computedAllowedHosts === undefined)
    {
      this.computeAllowedOriginsAndHosts();
    }
    return this._computedAllowedOrigins!;
  }

  computeAllowedHosts(): string[]
  {
    if (this._computedAllowedHosts === undefined)
    {
      this.computeAllowedOriginsAndHosts();
    }
    return Array.from(this._computedAllowedHosts!);
  }

  computeAllowedOriginsAndHosts(): void
  {
    const portNumber = this.webServerPortNumber;
    const origins: Set<string> = new Set<string>();
    const hosts: Set<string> = new Set<string>([ this.localhost, this.loopbackIpAddress, "::1" ]);
    const http = "http";
    const https = "https";
    origins.add(`${http}://${this.localhost}:${portNumber}`);
    origins.add(`${https}://${this.localhost}:${portNumber}`);
    origins.add(`${http}://${this.loopbackIpAddress}:${portNumber}`);
    origins.add(`${https}://${this.loopbackIpAddress}:${portNumber}`);
    if (this.host !== this.loopbackIpAddress && this.host !== this.allInterfacesIpAddress)
    {
      origins.add(`${http}://${this.host}:${portNumber}`);
      origins.add(`${https}://${this.host}:${portNumber}`);
      if (this.host !== undefined)
      {
        hosts.add(this.host.toLowerCase());
      }
    }
    if (this.allowedOrigins !== undefined)
    {
      for (const origin of this.allowedOrigins)
      {
        origins.add(origin.endsWith("/") ? origin.substring(0, origin.length - 1) : origin);
        try
        {
          const url = new URL(origin);
          hosts.add(url.hostname.toLowerCase());
        }
        catch (error)
        {
          // We ignore invalid origin URLs
        }
      }
    }
    this._computedAllowedOrigins = Array.from(origins);
    this._computedAllowedHosts = hosts;
  }

  isAllowedOrigin(origin: string | undefined): boolean
  {
    if (origin === undefined)
    {
      return true;
    }
    if (this.desktopSchemes.some(scheme => origin.startsWith(scheme)) === true)
    {
      return true;
    }
    const allowedOrigins = this.computeAllowedOrigins();
    const normalizedOrigin = origin.endsWith("/") ? origin.substring(0, origin.length - 1) : origin;
    return allowedOrigins.includes(normalizedOrigin);
  }

  isAllowedHost(hostHeader: string | undefined): boolean
  {
    if (hostHeader === undefined)
    {
      return false;
    }
    // We strip port if present, handling IPv6 bracketed hosts like [::1]:3001
    let hostname = hostHeader;
    if (hostname.startsWith("["))
    {
      const closingBracketIndex = hostname.indexOf("]");
      if (closingBracketIndex !== -1)
      {
        hostname = hostname.substring(1, closingBracketIndex);
      }
    }
    else
    {
      const firstColonIndex = hostname.indexOf(":");
      const lastColonIndex = hostname.lastIndexOf(":");
      // We only strip the port if there is a single colon, as multiple colons denote an unbracketed IPv6 address
      if (firstColonIndex !== -1 && firstColonIndex === lastColonIndex)
      {
        hostname = hostname.substring(0, firstColonIndex);
      }
    }
    if (this._computedAllowedHosts === undefined)
    {
      this.computeAllowedOriginsAndHosts();
    }
    return this._computedAllowedHosts!.has(hostname.toLowerCase());
  }

}

export const networkSecurity = NetworkSecurity.instance;

