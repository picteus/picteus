export type RequestBody<B> = B | { [key: string]: B[] };

export interface MonitorInstruction<B, W, T>
{

  baseUrl: string;

  onStart: (url: string, method: string, body: RequestBody<B> | undefined) => Promise<T | undefined>;

  onEnd: (contents: W, object: T) => Promise<void>;

}

interface RequestIdentifier
{

  url: string;

  method: string;

}

interface ObjectAndInstruction<B, W, T>
{

  contents: W;

  object: T;

  instruction: MonitorInstruction<B, W, T>;

}

export class RequestMonitor<B, W>
{

  private readonly instructions: MonitorInstruction<B, W, any>[] = [];

  private readonly perUrlObjectsMap: Map<RequestIdentifier, ObjectAndInstruction<B, W, any>> = new Map<RequestIdentifier, ObjectAndInstruction<B, W, any>>();

  watch<T>(instruction: MonitorInstruction<B, W, T>): void
  {
    this.instructions.push(instruction);
  }

  async onBeforeRequest(contentsProvider: () => Promise<W>, url: string, method: string, body: RequestBody<B> | undefined): Promise<void>
  {
    for (const instruction of this.instructions)
    {
      if (url.startsWith(instruction.baseUrl) === true)
      {
        const object: any = await instruction.onStart(url, method, body);
        if (object !== undefined)
        {
          const contents = await contentsProvider();
          this.perUrlObjectsMap.set({ url, method }, { contents, object, instruction });
        }
      }
    }
  }

  async onCompleted(url: string, method: string): Promise<void>
  {
    for (const [key, value] of this.perUrlObjectsMap)
    {
      if (key.url === url && key.method === method)
      {
        try
        {
          await value.instruction.onEnd(value.contents, value.object);
        }
        finally
        {
          this.perUrlObjectsMap.delete(key);
        }
      }
    }
  }

}
