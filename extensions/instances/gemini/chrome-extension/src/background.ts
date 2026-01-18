import ResourceType = chrome.webRequest.ResourceType;

import {
  ApplicationMetadata,
  Configuration,
  GenerationRecipe,
  ImageApi,
  ImageFeatureFormat,
  ImageFeatureType,
  PromptKind,
  RepositoryApi
} from "@picteus/ws-client";

import { MonitorInstruction, RequestBody, RequestMonitor } from "./requestMonitor";
import { ChromeContents } from "./chromeContents";
import { getSettings, isRunningInElectron } from "./common";


const isTest = !(Math.random() < 1);
const enableGeminiAppDetector = !(Math.random() < 1);
const enableExtra = !(Math.random() < 1);
const areDebugLogs = !(Math.random() < 1);

async function fetchImage(imageUrl: string): Promise<{ buffer: ArrayBuffer, mimeType: string } | undefined>
{
  console.debug(`Fetching the image at URL '${imageUrl}'`);
  const response = await fetch(imageUrl);
  if (response.ok === false)
  {
    console.error(`The image at URL '${imageUrl}' could not be fetched, because of an HTTP status code ${response.status} and message '${response.statusText}'`);
    return undefined;
  }
  const blob = await response.blob();
  return { buffer: await blob.arrayBuffer(), mimeType: response.headers.get("content-type") };
}

async function storeImage(imageUrl: string, imageBufferOrBlob: ArrayBuffer | Blob, mimeType: string, prompt: string): Promise<void>
{
  const settings = await getSettings();
  if (settings !== undefined)
  {
    if (settings.webServicesBaseUrl !== undefined)
    {
      const blob = imageBufferOrBlob instanceof Blob ? imageBufferOrBlob : new Blob([imageBufferOrBlob], { type: mimeType });
      const recipe: GenerationRecipe =
        {
          schemaVersion: 1,
          modelTags: ["google/gemini-2.5-flash-image:2.5"],
          software: "google/gemini",
          prompt: { kind: PromptKind.Textual, text: prompt }
        };
      const configuration = new Configuration({
        basePath: settings.webServicesBaseUrl,
        apiKey: settings.apiKey
      });
      const repositoryApi = new RepositoryApi(configuration);
      const extensionId = "gemini";
      const applicationMetadata: ApplicationMetadata = { items: [{ extensionId, value: recipe }] };
      const image = await repositoryApi.repositoryStoreImage({
        id: settings.repositoryId ?? (await repositoryApi.repositoryEnsure({
          technicalId: extensionId,
          name: "Gemini"
        })).id,
        sourceUrl: imageUrl,
        applicationMetadata: JSON.stringify(applicationMetadata),
        body: blob
      });
      const imageApi = new ImageApi(configuration);
      await imageApi.imageSetTags({
        id: image.id,
        extensionId: extensionId,
        requestBody: [extensionId]
      });
      await imageApi.imageSetFeatures({
        id: image.id,
        extensionId,
        imageFeature:
          [
            {
              type: ImageFeatureType.Recipe,
              format: ImageFeatureFormat.Json,
              value: JSON.stringify(recipe)
            },
            {
              type: ImageFeatureType.Description,
              format: ImageFeatureFormat.String,
              name: "prompt",
              value: prompt
            }
          ]
      });
    }
  }
}

class ImageOpener
{

  async run(tabId: number, url: string)
  {
    async function openFunction(url: string): Promise<undefined>
    {
      window.open(url);
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      func: openFunction,
      args: [url]
    });
  }

}

class WindowUrlMonitor
{

  private interval?: number;

  private readonly tabIds = new Set<number>;

  start(baseUrl: string, onStartTab: (tab: chrome.tabs.Tab) => Promise<void>, onEndTab: (tab: chrome.tabs.Tab | number) => Promise<void>): void
  {
    // @ts-ignore
    this.interval = setInterval(async () =>
    {
      const tabs = await chrome.tabs.query({});
      const currentTabIds = new Set<number>();
      for (const tab of tabs)
      {
        currentTabIds.add(tab.id);
        if (tab.url !== undefined)
        {
          if (this.tabIds.has(tab.id) === false)
          {
            if (tab.url.startsWith(baseUrl) === true)
            {
              this.tabIds.add(tab.id);
              console.info(`The tab with id '${tab.id}' was detected with the URL ${baseUrl}`);
              await onStartTab(tab);
            }
          }
          else if (tab.url.startsWith(baseUrl) === false)
          {
            console.debug(`The tab with id '${tab.id}' does not start anymore with the URL '${baseUrl}'`);
            this.tabIds.delete(tab.id);
            await onEndTab(tab);
          }
        }
      }
      const copiedTabIds = new Set<number>(this.tabIds);
      for (const copiedTabId of copiedTabIds)
      {
        if (currentTabIds.has(copiedTabId) === false)
        {
          console.debug(`The tab with id '${copiedTabId}' does not exist anymore`);
          this.tabIds.delete(copiedTabId);
          await onEndTab(copiedTabId);
        }
      }
    }, (1_000 / 60) * 5);
  }

  stop(): void
  {
    if (this.interval !== undefined)
    {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

}

class GeminiAppImportButtonAdder
{

  private static capturerFunction(): () => Promise<undefined>
  {
    return async function run()
    {
      class ClipBoardMonitor
      {

        static async blobToBase64(blob: Blob): Promise<string | ArrayBuffer>
        {
          return new Promise<string | ArrayBuffer>((resolve, reject) =>
          {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = err => reject(err);
            reader.readAsDataURL(blob);
          });
        }

        async run(prompt: string, callback: () => Promise<void>)
        {
          return new Promise<Blob | undefined>(async (resolve, reject) =>
          {
            const currentBlob = await this.getClipboardImage();
            await callback();
            const milliseconds = Date.now();
            let messageSent = false;
            const interval = setInterval(async () =>
            {
              // console.debug(`Checking the clipboard for an image related to the prompt '${prompt}'`);
              let blob;
              try
              {
                blob = await this.getClipboardImage();
              }
              catch (error)
              {
                // This may happen if the document loses the focus
              }
              if (blob !== undefined)
              {
                if (currentBlob === undefined || (currentBlob.size !== blob.size || currentBlob.type !== blob.type))
                {
                  if (messageSent !== true)
                  {
                    console.info(`Found the clipboard image relative to the prompt '${prompt}'`);
                    messageSent = true;
                    clearInterval(interval);
                    resolve(blob);
                  }
                  return;
                }
              }
              if ((Date.now() - milliseconds) > 5_000)
              {
                clearInterval(interval);
                reject(new Error("Clipboard time-out"));
              }
            }, 1_000 / 60);
          });
        }

        private async getClipboardImage(): Promise<Blob | undefined>
        {
          const clipboardContents = await navigator.clipboard.read();
          for (const item of clipboardContents)
          {
            const validTypes = [];
            for (const type of item.types)
            {
              if (type.startsWith("image/") === true)
              {
                validTypes.push(type);
              }
            }
            if (validTypes.length > 0)
            {
              const mimeType = validTypes[0];
              return await item.getType(mimeType);
            }
          }
          return undefined;
        }

      }

      // noinspection CssInvalidHtmlTagReference
      const userQueryNodes = document.querySelectorAll("user-query p.query-text-line");
      // noinspection CssInvalidHtmlTagReference
      const copyButtonNodes = document.querySelectorAll("copy-button > button");
      // noinspection CssInvalidHtmlTagReference
      const imageNodes = document.querySelectorAll("single-image img");

      if (copyButtonNodes.length !== userQueryNodes.length || imageNodes.length !== userQueryNodes.length)
      {
        console.warn("Could not find all the corresponding prompt and copy button and images");
        return undefined;
      }
      // console.debug(`Found ${userQueryNodes.length} node candidate(s)`);

      // @ts-ignore
      window.picteus = window.picteus || { handledNodes: [] };
      // @ts-ignore
      const handledNodes: Node[] = window.picteus.handledNodes;

      for (let index = 0; index < userQueryNodes.length; index++)
      {
        const userQueryNode = userQueryNodes[index] as HTMLElement;
        const copyButtonNode = copyButtonNodes[index] as HTMLButtonElement;
        const imageNode = imageNodes[index] as HTMLImageElement;
        const parentNode = copyButtonNode.parentNode.parentNode;
        if (handledNodes.indexOf(parentNode) !== -1)
        {
          continue;
        }
        const prompt = userQueryNode.innerText;
        const imageUrl = imageNode.src;
        console.debug(`Found the prompt '${prompt}' and the image URL '${imageUrl}'`);
        const button = document.createElement("button");
        button.innerText = "Import";
        button.onclick = async () =>
        {
          console.log(`Clicked on the import button for the prompt '${prompt}'`);
          try
          {
            const blob = await new ClipBoardMonitor().run(prompt, async () =>
            {
              await chrome.runtime.sendMessage({ command: "startMonitoring" });
              copyButtonNode.click();
            });
            await chrome.runtime.sendMessage({
              command: "store",
              base64: await ClipBoardMonitor.blobToBase64(blob),
              type: blob.type,
              prompt
            });
          }
          catch (error)
          {
            console.error("An error occurred while monitoring the clipboard", error);
          }
        };
        parentNode.appendChild(button);
        handledNodes.push(parentNode);
        await chrome.runtime.sendMessage({ command: "importButtonAdded", prompt });
      }

    };
  }

  static queryFunction(): () => { prompt: string, imageUrl: string }[] | undefined
  {
    return function run()
    {
      // noinspection CssInvalidHtmlTagReference
      const userQueryNodes = document.querySelectorAll("user-query p.query-text-line");
      // noinspection CssInvalidHtmlTagReference
      const copyButtonNodes = document.querySelectorAll("copy-button > button");
      // noinspection CssInvalidHtmlTagReference
      const imageNodes = document.querySelectorAll("single-image img");

      if (copyButtonNodes.length !== userQueryNodes.length || imageNodes.length !== userQueryNodes.length)
      {
        console.warn("Could not find all the corresponding prompt and copy button and images");
        return undefined;
      }
      const promptAndImageUrls: { prompt: string, imageUrl: string }[] = [];
      for (let index = 0; index < userQueryNodes.length; index++)
      {
        const userQueryNode = userQueryNodes[index] as HTMLElement;
        const imageNode = imageNodes[index] as HTMLImageElement;
        promptAndImageUrls.push({ prompt: userQueryNode.innerText, imageUrl: imageNode.src });
      }
      return promptAndImageUrls;

    };
  }

  private listener?: (message: any, _sender: chrome.runtime.MessageSender, _sendResponse: any) => Promise<void>;

  start(): GeminiAppImportButtonAdder
  {
    let imageRecorder: ImageRecorder;
    this.listener = async (message: any, _sender: chrome.runtime.MessageSender, _sendResponse: any) =>
    {
      const { command } = message;
      console.log(`Received the command '${command}' via a message`);
      if (command === "importButtonAdded")
      {
        const { prompt } = message;
        console.debug(`Added an import button relative to the prompt '${prompt}'`);
      }
      else if (command === "startMonitoring")
      {
        imageRecorder = new ImageRecorder();
        imageRecorder.start();
      }
      else if (command === "stopMonitoring")
      {
        if (imageRecorder !== undefined)
        {
          imageRecorder.stop();
          imageRecorder = undefined;
        }
      }
      else if (command === "store")
      {
        const { base64, type, prompt } = message;
        let imageUrl: string;
        if (imageRecorder !== undefined)
        {
          const imageUrls = imageRecorder.stop();
          if (imageUrls.length === 0)
          {
            console.error(`Could not detect the URL of the image associated with the prompt '${prompt}'`);
            return;
          }
          imageUrl = imageUrls[imageUrls.length - 1];
          imageRecorder = undefined;
        }

        async function b64toBlob(dataUri: string): Promise<Blob>
        {
          const response = await fetch(dataUri);
          return await response.blob();
        }

        const blob = await b64toBlob(base64);
        await storeImage(imageUrl, blob, type, prompt);
      }
    };
    chrome.runtime.onMessage.addListener(this.listener);
    return this;
  }

  async check(tabId: number): Promise<void>
  {
    // console.debug(`Handling the generated images for the tab with id '${tabId}'`);
    await chrome.scripting.executeScript({
      target: { tabId },
      func: GeminiAppImportButtonAdder.capturerFunction(),
      args: []
    });
  }

  stop(): void
  {
    if (this.listener !== undefined)
    {
      chrome.runtime.onMessage.removeListener(this.listener);
      this.listener = undefined;
    }
  }

}

class ImageRecorder
{

  private listener?: (details: chrome.webRequest.OnBeforeRequestDetails) => chrome.webRequest.BlockingResponse;

  private readonly imageUrls: string[] = [];

  start(onImage?: ((url: string) => Promise<void>) | undefined): void
  {
    const googleUserContentBaseUrl = "https://lh3.googleusercontent.com";
    const googleBaseUrl = "https://lh3.google.com";
    console.info(`Starts monitoring the network requests for the images with URL starting with '${googleUserContentBaseUrl}' or '${googleBaseUrl}'`);
    const urls = [`${googleUserContentBaseUrl}/*`, `${googleBaseUrl}/*`];
    this.listener = (details: chrome.webRequest.OnBeforeRequestDetails): chrome.webRequest.BlockingResponse =>
    {
      console.debug(`Detected the image with URL '${details.url}'`);
      this.imageUrls.push(details.url);
      if (onImage !== undefined)
      {
        onImage(details.url).catch(console.error);
      }
      return undefined;
    };
    chrome.webRequest.onBeforeRequest.addListener(this.listener, { urls }, []);
  }

  stop(): string[]
  {
    if (this.listener !== undefined)
    {
      chrome.webRequest.onBeforeRequest.removeListener(this.listener);
    }
    return this.imageUrls;
  }

}

class GeminiAppDetector
{

  private readonly perTabIdIntervals = new Map<number, number>();

  run(): void
  {
    const adder = new GeminiAppImportButtonAdder().start();
    new WindowUrlMonitor().start("https://gemini.google.com", async (tab: chrome.tabs.Tab) =>
    {
      // @ts-ignore
      const interval: number = setInterval(async () =>
      {
        await adder.check(tab.id);
      }, (1_000 / 60) * 5);
      this.perTabIdIntervals.set(tab.id, interval);
    }, async (tab: chrome.tabs.Tab | number) =>
    {
      const tabId = tab instanceof Number ? tab as number : (tab as chrome.tabs.Tab).id;
      const interval = this.perTabIdIntervals.get(tabId);
      if (interval !== undefined)
      {
        this.perTabIdIntervals.delete(tabId);
        clearInterval(interval);
      }
    });
  }

}

class GeminiImageGenerationMonitor
{

  run(): void
  {
    const testInstruction: MonitorInstruction<ArrayBuffer, ChromeContents, string> =
      {
        baseUrl: "http://localhost:3001",
        onStart: async (_url: string, _method: string, _body: RequestBody<ArrayBuffer> | undefined): Promise<string | undefined> =>
        {
          // return url.endsWith("miscellaneous/ping") === true ? "pong" : undefined;
          return "pong";
        },
        onEnd: async (webContents: ChromeContents, object: string): Promise<void> =>
        {
          {
            async function run(text: string): Promise<string>
            {
              alert(text);
              return text;
            }

            await chrome.scripting.executeScript({
              target: { tabId: webContents.tabId, frameIds: [webContents.frameId] },
              func: run,
              args: [object]
            });
          }
          {
            const [injectionResult] = await chrome.scripting.executeScript({
              target: { tabId: webContents.tabId, frameIds: [webContents.frameId] },
              func: fetchImage,
              args: ["https://www.lummi.ai/api/pro/image/09377648-6a29-49c5-b37c-8ba85df8b01b?asset=original&cb=SpQ7DM&auto=format&w=1500"]
            });
            const result = injectionResult.result;
            const blob = new Blob([result.buffer], { type: result.mimeType });
            console.dir(blob);
          }
        }
      };

    const geminiInstruction: MonitorInstruction<ArrayBuffer, ChromeContents, string> =
      {
        baseUrl: "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate",
        onStart: async (_url: string, method: string, body: RequestBody<ArrayBuffer> | undefined): Promise<string | undefined> =>
        {
          if (method === "POST" && body !== undefined && body instanceof ArrayBuffer === false)
          {
            console.debug("Detected a Gemini image generation");
            const array: ArrayBuffer[] = body["f.req"];
            const arrayBuffer = array[0];
            const string = new TextDecoder("utf8").decode(arrayBuffer);
            const prompt = JSON.parse(JSON.parse(string)[1])[0][0];
            console.info(`The detected Gemini prompt is '${prompt}'`);
            return prompt;
          }
          return undefined;
        },
        onEnd: async (webContents: ChromeContents, prompt: string): Promise<void> =>
        {
          console.debug("The Gemini image generation is over");

          async function findImageUrl(text: string): Promise<string | undefined>
          {
            function findImageAfterTextAnywhere(text: string): { id: string, src: string, alt: string } | null
            {
              const walker = document.createNodeIterator(
                document.body,
                NodeFilter.SHOW_TEXT,
                null
              );

              let foundNode = null;
              let currentNode;

              while (currentNode = walker.nextNode())
              {
                if (currentNode.nodeValue?.includes(text))
                {
                  foundNode = currentNode;
                  break;
                }
              }

              if (!foundNode)
              {
                return null;
              }

              let containerElement = foundNode.parentElement;

              if (!containerElement)
              {
                return null;
              }

              const allImages = Array.from(document.querySelectorAll("img"));
              let nextImage = null;

              for (const img of allImages)
              {
                if (containerElement.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING)
                {
                  nextImage = img;
                  break;
                }
              }

              if (nextImage)
              {
                // 4. Return serializable properties of the image
                return {
                  src: nextImage.src,
                  alt: nextImage.alt,
                  id: nextImage.id
                };
              }

              return null;
            }

            return new Promise<string | undefined>((resolve) =>
            {
              const milliseconds = Date.now();
              const interval = setInterval(() =>
              {
                const result = findImageAfterTextAnywhere(text);
                if (result !== null)
                {
                  clearInterval(interval);
                  resolve(result?.src);
                }
                else if ((Date.now() - milliseconds) >= 10_000)
                {
                  clearInterval(interval);
                  resolve(undefined);
                }
              }, 1_000 / 60);
            });
          }

          const [{ result: imageUrl }] = await chrome.scripting.executeScript({
            target: { tabId: webContents.tabId, frameIds: [webContents.frameId] },
            func: findImageUrl,
            args: [prompt]
          });
          console.log(`The detected Gemini image URL is '${imageUrl}'`);
          if (imageUrl !== undefined)
          {
            await new ImageOpener().run(webContents.tabId, imageUrl);
            const [{ result: innerResult }] = await chrome.scripting.executeScript({
              target: { tabId: webContents.tabId, frameIds: [webContents.frameId] },
              func: GeminiAppImportButtonAdder.queryFunction(),
              args: [imageUrl]
            });
            if (innerResult === undefined)
            {
              console.error("Could not retrieve from the DOM the prompts and the image URLs");
              return;
            }
            const candidates = innerResult.filter((promptAndImageUrl) => promptAndImageUrl.prompt === prompt);
            if (candidates.length === 0)
            {
              console.error("Could not retrieve from the DOM the prompt '" + prompt + "'");
              return;
            }
            const domImageUrl = candidates[candidates.length - 1].imageUrl;
            const [{ result: innerInnerResult }] = await chrome.scripting.executeScript({
              target: { tabId: webContents.tabId, frameIds: [webContents.frameId] },
              func: fetchImage,
              args: [domImageUrl]
            });
            if (innerInnerResult !== undefined)
            {
              await storeImage(imageUrl, innerInnerResult.buffer, innerInnerResult.mimeType, prompt);
            }
          }
        }
      };

    const instruction: MonitorInstruction<ArrayBuffer, ChromeContents, string> = isTest === true ? testInstruction : geminiInstruction;
    const requestMonitor = new RequestMonitor<ArrayBuffer, ChromeContents>();
    requestMonitor.watch(instruction);

    function onBeforeRequest(details: chrome.webRequest.OnBeforeRequestDetails): chrome.webRequest.BlockingResponse | undefined
    {
      if (areDebugLogs === true)
      {
        console.debug(`An event occurred before the request with URL '${details.url}' on tab with id '${details.tabId}', frame with id '${details.frameId}'`);
      }
      let body: RequestBody<ArrayBuffer> | undefined = undefined;
      if (details.requestBody !== undefined)
      {
        if (details.requestBody.raw !== undefined && details.requestBody.raw.length > 0)
        {
          body = details.requestBody.raw[0].bytes;
        }
        else if (details.requestBody.formData !== undefined)
        {
          body = {};
          for (const [key, value] of Object.entries(details.requestBody.formData))
          {
            const values: chrome.webRequest.FormDataItem [] = value;
            body[key] = values.map(value => typeof value === "string" ? new TextEncoder().encode(value).buffer : value);
          }
        }
      }

      const contents: ChromeContents =
        {
          frameId: details.frameId,
          tabId: details.tabId
        };
      requestMonitor.onBeforeRequest(async () =>
      {
        if (contents.tabId !== -1 || details.initiator.startsWith("chrome-extension") === true)
        {
          // This happens when running the extension in an Electron application
          return contents;
        }
        const tabs = await chrome.tabs.query({ windowType: chrome.tabs.WindowType.NORMAL });
        const filteredTabs = tabs.filter(tab => tab.title !== "DevTools").filter(tab => tab.url?.startsWith(details.initiator) === true);
        const [tab] = filteredTabs;
        // noinspection UnnecessaryLocalVariableJS
        const fixedContents =
          {
            ...contents,
            tabId: tab.id!
          };
        return fixedContents;
      }, details.url, details.method, body).catch((error) =>
      {
        console.error(`An unexpected error occurred at the start of the monitoring of the network request with URL '${details.url}'`, error);
      });
      return undefined;
    }

    function onCompleted(details: chrome.webRequest.OnCompletedDetails): void
    {
      if (areDebugLogs === true)
      {
        console.debug(`An event occurred after the request with URL '${details.url}' on tab with id '${details.tabId}', frame with id '${details.frameId}'`);
      }
      requestMonitor.onCompleted(details.url, details.method).catch((error) =>
      {
        console.error(`An unexpected error occurred at the end of the monitoring of the network request with URL '${details.url}'`, error);
      });
    }

    // noinspection HttpUrlsUsage
    const requestsUrls = isTest === true ? ["http://*/*", "https://*/*"] : ["https://gemini.google.com/*"];
    const urls = [...requestsUrls];
    console.log(`Picteus Gemini Chrome extension started, monitoring the requests to URLs [${urls.map(url => `'${url}'`).join(", ")}]`);
    const types = [ResourceType.XMLHTTPREQUEST, ResourceType.WEBSOCKET, ResourceType.MAIN_FRAME, ResourceType.SCRIPT, ResourceType.SUB_FRAME, ResourceType.OTHER];
    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
      urls,
      types
    }, [chrome.webRequest.OnBeforeRequestOptions.REQUEST_BODY]);
    chrome.webRequest.onCompleted.addListener(onCompleted, { urls, types }, []);
  }
}

class KeepAliveGuard
{

  async run(): Promise<void>
  {
    // This prevents the worker thread from stopping when run inside an Electron application
    // keepAliveViaInterval();
    await this.keepAliveViaOffscreen();
  }

  private async keepAliveViaOffscreen(): Promise<void>
  {
    console.log("Adding an offscreen activity to keep the extension alive");

    async function createOffscreen(): Promise<void>
    {
      if (await chrome.offscreen.hasDocument() === false)
      {
        await chrome.offscreen.createDocument({
          url: "offscreen.html",
          reasons: ["BLOBS"],
          justification: "Keeps the service worker alive"
        });
      }
    }

    chrome.runtime.onStartup.addListener(createOffscreen);
    await createOffscreen();

    chrome.runtime.onMessage.addListener((message: any): void =>
    {
      if (message.command === "keepAlive")
      {
        console.log("The Picteus Gemini Chrome extension is still alive");
      }
    });
  }

  // noinspection JSUnusedLocalSymbols
  private keepAliveViaInterval(): void
  {
    setInterval(async () =>
    {
      console.log("The Picteus Chrome extension is still running");
      await fetch("http://dummy.url").catch(() =>
      {
      });
    }, 20_000);
  }

}

class ExtraRunner
{

  async run(): Promise<void>
  {
    const captureId = "capture";
    chrome.contextMenus.create({
      id: captureId,
      title: "Capture",
      enabled: true,
      contexts: [chrome.contextMenus.ContextType.PAGE]
    });
    const canvasId = "canvas";
    chrome.contextMenus.create({
      id: canvasId,
      title: "Canvas",
      enabled: true,
      contexts: [chrome.contextMenus.ContextType.PAGE]
    });
    const debuggerId = "debugger";
    chrome.contextMenus.create({
      id: debuggerId,
      title: "Debugger",
      enabled: true,
      contexts: [chrome.contextMenus.ContextType.PAGE]
    });
    chrome.contextMenus.onClicked.addListener(async (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) =>
    {
      if (info.menuItemId === captureId)
      {
        const blob = await chrome.pageCapture.saveAsMHTML({ tabId: tab.id });
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const base64String = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        await chrome.downloads.download({
          url: "data:application/octet-stream;base64," + base64String,
          filename: "page.mhtml"
        });
      }
      else if (info.menuItemId === canvasId)
      {

        async function canvas(): Promise<undefined>
        {
          const canvas = document.createElement("canvas");
          canvas.width = 1024;
          canvas.height = 1024;
          const context = canvas.getContext("2d");
          const image = new Image();
          image.onload = () =>
          {
            context.drawImage(image, 0, 0);
            document.body.appendChild(canvas);
          };
          image.src = "https://realpython.com/cdn-cgi/image/width=1920,format=auto/https://files.realpython.com/media/Thread-Safety-in-Python_Watermarked.434d0dbc3127.jpg";
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: canvas,
          args: []
        });
      }
      else if (info.menuItemId === debuggerId)
      {
        await this.runDebugger();
      }
    });
  }

  private async runDebugger(): Promise<void>
  {
    const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = currentTabs[0];
    chrome.debugger.attach({ tabId: tab.id }, "1.3", () =>
    {
      chrome.debugger.sendCommand({ tabId: tab.id }, "Network.enable");
    });
    chrome.debugger.onEvent.addListener((source, method, params) =>
    {
      if (method === "Network.loadingFinished")
      {
        // @ts-ignore
        chrome.debugger.sendCommand({ tabId: source.tabId }, "Network.getResponseBody", { requestId: params.requestId },
          function(response)
          {
            console.dir(response);
          }
        );
      }
    });

  }

}

async function main(): Promise<void>
{
  console.log("Starting the Picteus Gemini Chrome extension…");
  if (isRunningInElectron() === true)
  {
    await new KeepAliveGuard().run();
  }
  new GeminiAppDetector().run();
  if (enableGeminiAppDetector === true)
  {
    new GeminiImageGenerationMonitor().run();
  }
  if (enableExtra === true)
  {
    await new ExtraRunner().run();
  }
}

main().catch(console.error);
