import { Queue } from "async-await-queue";
import { Log } from "ts-tiny-log";


export class Classifiers
{

  private classifier?: any = undefined;

  private readonly queue = new Queue(1, 0);

  public constructor(private readonly logger: Log, private readonly cacheDirectoryPath: string)
  {
  }

  async computeCaption(path: string): Promise<string>
  {
    const hash = Symbol();
    await this.queue.wait(hash, -1);
    try
    {
      this.logger.debug(`Computing the caption for the image in file '${path}'`);
      type ImageToTextSingle =
        {
          /**
           * The generated text.
           */
          generated_text: string;
        };

      const image = await this.extractRawImage(path);
      const classifier = await this.computeClassifier();
      const result = await classifier(image, { max_length: 1024 });

      const caption = (result[0] as ImageToTextSingle).generated_text;
      this.logger.info(`The caption for the image in file '${path}' is '${caption}'`);
      return caption;
    }
    finally
    {
      this.queue.end(hash);
    }

  }

  async computeSegments(filePath: string): Promise<string>
  {
    this.logger.debug(`Computing the segments for the image in file '${filePath}'`);
    const { pipeline, RawImage } = await import("@xenova/transformers");
    const image = await RawImage.read(filePath);
    const segmenter = await pipeline("image-segmentation", "Xenova/detr-resnet-50-panoptic", {
      quantized: true,
      progress_callback: this.computeProgressCallback()
    });
    const output = await segmenter(image);
    return JSON.stringify(output);
  }

  private async extractRawImage(path: string)
  {
    const { RawImage } = await import("@xenova/transformers");
    return await RawImage.read(path);
  }

  private async computeClassifier()
  {
    if (this.classifier === undefined)
    {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowRemoteModels = true;
      env.allowLocalModels = true;
      env.useFS = true;
      env.cacheDir = this.cacheDirectoryPath;
      env.backends.onnx.logLevel = "fatal";
      env.backends.onnx.debug = false;
      this.classifier = await pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning", {
        quantized: true,
        progress_callback: this.computeProgressCallback()
      });
    }
    return this.classifier;
  }

  private computeProgressCallback()
  {
    return (data:
            {
              status: string,
              name: string,
              file: string,
              progress?: number,
              loaded?: number,
              total?: number
            }) =>
    {
      if (data.progress === undefined)
      {
        this.logger.debug(`Classifier '${data.name}' in file '${data.file}' ${data.progress === undefined ? (`with status '${data.status}'`) : (`with progress ${data.progress}`)}`);
      }
    };
  }

}
