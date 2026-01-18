import fs from "node:fs";
import stream, { Duplex } from "node:stream";

import sharp, { FitEnum, Metadata, ResizeOptions } from "sharp";
import EXIF from "exif-js";
import exif from "exif-reader";
import { parse as parseIcc } from "icc";
import heicDecode from "heic-decode";
import * as AddMetaPng from "meta-png";
import piexif from "piexifjs";
import exifremove from "exifremove";
import ExifTransformer from "exif-be-gone";
import Exifr from "exifr";
import { XMLParser } from "fast-xml-parser";

import { logger } from "../../logger";
import { Json } from "../../bos";
import { ImageFormat, NumericRange } from "../../dtos/app.dtos";
import { parametersChecker } from "./parametersChecker";
import * as PngMetadata from "../../libs/png-metadata/index";
import { stripIccMetadata, stripIptcMetadata, stripJpegJfifMetadata, stripXmpMetadata } from "./metadataStrippers";

const { parse: parseExifr } = Exifr;
const { addMetadata } = AddMetaPng;
const { encodeChunks, extractChunks, writeMetadata: pngWriteMetadata } = PngMetadata.default;


type DefinedBitmapFormat =
  | "avif"
  | "dcraw"
  | "dz"
  | "exr"
  | "fits"
  | "gif"
  | "heif"
  | "input"
  | "jpeg"
  | "jpg"
  | "jp2"
  | "jxl"
  | "magick"
  | "openslide"
  | "pdf"
  | "png"
  | "ppm"
  | "rad"
  | "raw"
  | "svg"
  | "tiff"
  | "tif"
  | "v"
  | "webp";
export type BitmapFormat = undefined | DefinedBitmapFormat;
type BasisBitmapMetadata = Pick<Metadata, "format" | "compression" | "exif" | "icc" | "iptc" | "xmp" | "width" | "height" | "tifftagPhotoshop">
export type BitmapMetadata = BasisBitmapMetadata & {
  format: BitmapFormat
}

export enum ErrorCause {Internal, NotImplemented, InvalidImage}

export class ImageError extends Error
{

  public readonly cause: ErrorCause;

  constructor(message: string, code: ErrorCause)
  {
    super(message);
    this.cause = code;
  }

}

export type DefinedResizeFormat = "JPEG" | "PNG" | "WEBP" | "GIF" | "AVIF" | "HEIF";

export type ResizeFormat = DefinedResizeFormat | undefined;

export type ResizeRender = "inbox" | "outbox" | "crop" | "map" | undefined;

export type ImageMiscellaneousMetadata =
  {
    format: ImageFormat,
    all: Json | undefined,
    exif: Json | undefined,
    icc: Json | undefined,
    iptc: Json | undefined,
    xmp: Json | undefined,
    tiffTagPhotoshop: string | undefined,
    width: number | undefined,
    height: number | undefined
  };

export enum ImageMetadataType
{
  ALL = "all",
  ICC = "icc",
  IPTC = "iptc",
  XMP = "xmp",
  JFIF = "jfif"
}

export enum ImageMetadataAlgorithm
{
  sharp = "sharp",
  piexif = "piexif",
  exifremove = "exifremove",
  exifbegone = "exifbegone",
  internal = "internal"
}

// We monkey-patch a missing Exif property (values taken from https://exiftool.org/TagNames/EXIF.html)
piexif.ExifIFD.OffsetTimeOriginal = 0x9011;
piexif.TAGS.Exif[0x9011] = { name: "OffsetTimeOriginal", type: "Ascii" };

// noinspection JSUnresolvedReference
export const jpegUserCommentId = piexif.ExifIFD.UserComment;

// noinspection JSUnresolvedReference
const piexifUserComment = piexif.TAGS.Exif[jpegUserCommentId].name;
export const jpegUserCommentName = piexifUserComment.charAt(0).toLowerCase() + piexifUserComment.substring(1);
const targetPrinterId = piexif.ImageIFD.TargetPrinter;
const piexifTargetPrinter = piexif.TAGS.Image[targetPrinterId].name;

export const applicationMetadataPropertyName = "picteus";

const pngMetadataText = "tEXt";

function computeSharpOptions(): sharp.SharpOptions
{
  return { failOn: "none" };
}

export async function computeMetadataVisSharp(filePathOrBuffer: string | Buffer): Promise<BitmapMetadata>
{
  try
  {
    const {
      format,
      compression,
      exif,
      icc,
      iptc,
      xmp,
      width,
      height,
      tifftagPhotoshop
    } = await sharp(filePathOrBuffer, computeSharpOptions()).metadata();
    return { format: format, compression, exif, icc, iptc, xmp, width, height, tifftagPhotoshop };
  }
  catch (error)
  {
    throw new ImageError(`Unable to parse the image metadata. Reason: '${(error as Error).message}'`, ErrorCause.InvalidImage);
  }
}

function translateImageFormat(metadataFormat: DefinedBitmapFormat, metadataCompression: "av1" | "hevc" | undefined): ImageFormat
{
  if (metadataFormat === "heif" && metadataCompression === "av1")
  {
    // TODO: understand why the metadata of AVIF images produced by sharp generate an "heif" format and a "av1" compression
    return ImageFormat.AVIF;
  }
  const imageFormatUpperCase = metadataFormat.toUpperCase();
  return imageFormatUpperCase as ImageFormat;
}

function computeFormatViaSharp(metadata: BitmapMetadata, logChunk: string): ImageFormat
{
  const metadataFormat: BitmapFormat = metadata.format;
  const defaultFormat = ImageFormat.PNG;
  if (metadataFormat === undefined)
  {
    logger.warn(`Could not determine the format of the image${logChunk}: defaulting to '${defaultFormat}'`);
  }
  return metadataFormat === undefined ? defaultFormat : translateImageFormat(metadataFormat, metadata.compression);
}

export async function computeFormat(filePathOrBuffer: string | Buffer): Promise<ImageFormat>
{
  const metadata: BitmapMetadata = await computeMetadataVisSharp(filePathOrBuffer);
  return computeFormatViaSharp(metadata, Buffer.isBuffer(filePathOrBuffer) === true ? "" : ` '${filePathOrBuffer}'`);
}

function cleanExifProperties(properties: Record<string, any> | undefined | null): void
{
  if (properties === undefined || properties === null)
  {
    return;
  }

  function cleanExifProperty(property: any): string | null | undefined
  {
    if (property === undefined || property === null)
    {
      return undefined;
    }
    if (Array.isArray(property) === true && property.every(item => item instanceof Error) === true)
    {
      return null;
    }
    const ascii = "ASCII";
    const unicode = "UNICODE";
    const cleanString = (characters: number[]): string =>
    {
      return characters.filter((item: number) =>
      {
        return item !== 0;
      }).map((character: number) =>
      {
        return String.fromCharCode(character);
      }).join("");
    };
    if (Array.isArray(property) === true || Buffer.isBuffer(property) === true || ArrayBuffer.isView(property) === true)
    {
      const arrayObject = Buffer.isBuffer(property) === true ? [...property] : (ArrayBuffer.isView(property) === true ? Array.from(property as Uint8Array | Uint16Array | Uint32Array) : property);
      const containsNoNumber = arrayObject.find((item) =>
      {
        return typeof item !== "number";
      });
      if (containsNoNumber !== undefined)
      {
        for (const item of arrayObject)
        {
          cleanExifProperties(item);
        }
      }
      else
      {
        const decodedValue = String.fromCharCode(...arrayObject);
        if (decodedValue.startsWith(ascii) === true || decodedValue.startsWith(unicode) === true)
        {
          const string = cleanString(arrayObject);
          return string.substring((decodedValue.startsWith(ascii) === true ? ascii : unicode).length);
        }
      }
    }
    else if (typeof property === "string" && property.startsWith(unicode) === true)
    {
      const string = cleanString(Array.from(property).map((character) =>
      {
        return character.charCodeAt(0);
      }));
      return string.substring(unicode.length);
    }
    else if (typeof property === "object")
    {
      cleanExifProperties(property);
    }
  }

  const keys = Object.keys(properties);
  for (const key of keys)
  {
    const child = properties[key];
    const result = cleanExifProperty(child);
    if (result === null)
    {
      delete properties[key];
    }
    else if (result !== undefined)
    {
      properties[key] = result;
    }
  }
}

export async function readExifMetadata(imageBuffer: Buffer, exifBuffer: Buffer | undefined, imageFormat: ImageFormat): Promise<{
  allJsonObject: Json | undefined,
  exifJsonObject: Json | undefined,
  exifrExifAndIptc: Json | undefined
}>
{
  let allJsonObject: Json | undefined;
  let exifrExifAndIptc: Json | undefined;
  try
  {
    allJsonObject = await parseExifr(imageBuffer, true);
    cleanExifProperties(allJsonObject);
    if (allJsonObject !== undefined && Object.keys(allJsonObject).length === 0)
    {
      allJsonObject = undefined;
    }
    exifrExifAndIptc = await parseExifr(imageBuffer, { iptc: true, exif: true, xmp: false, mergeOutput: false });
  }
  catch (error)
  {
    if (imageFormat !== ImageFormat.WEBP && imageFormat !== ImageFormat.GIF)
    {
      // WEBP and GIF images are not handled by the "exifr" library
      parametersChecker.throwInternalError(`Cannot read the image metadata${error === undefined ? "" : `. Reason: '${(error as Error).message}'`}`);
    }
  }
  const exifrJsonObject = exifrExifAndIptc === undefined ? undefined : exifrExifAndIptc.exif;
  const exifJsJsonObject = imageFormat !== ImageFormat.JPEG ? undefined : EXIF.readFromBinaryFile(imageBuffer.buffer);
  const exifReaderJsonObject = exifBuffer === undefined ? undefined : exif(exifBuffer);
  const exifJsonObject: Json | undefined = exifrJsonObject !== undefined ? exifrJsonObject : (exifJsJsonObject === undefined ? exifReaderJsonObject : (exifJsJsonObject === undefined ? undefined : exifReaderJsonObject));
  if (exifJsonObject !== undefined)
  {
    cleanExifProperties(exifJsonObject);
  }
  return { allJsonObject, exifJsonObject, exifrExifAndIptc };
}

// An interesting library for managing images metadata is "exiftool-vendored", see https://photostructure.github.io/exiftool-vendored.js/index.html
// The documentation about the IPTC metadata is available at https://iptc.org/standards/photo-metadata/iptc-standard/
// An interesting article describing the EXIF and IPTC metadata is https://fotoloco.fr/exif-et-iptc-les-metadonnees-integrees-a-vos-photos/
export async function readMetadata(filePathOrBuffer: string | Buffer): Promise<ImageMiscellaneousMetadata>
{
  const metadata: BitmapMetadata = await computeMetadataVisSharp(filePathOrBuffer);
  const imageFormat: ImageFormat = computeFormatViaSharp(metadata, Buffer.isBuffer(filePathOrBuffer) === true ? "" : ` '${filePathOrBuffer}'`);
  const buffer: Buffer = Buffer.isBuffer(filePathOrBuffer) === true ? filePathOrBuffer as Buffer : fs.readFileSync(filePathOrBuffer);
  const {
    allJsonObject,
    exifJsonObject,
    exifrExifAndIptc
  } = await readExifMetadata(buffer, metadata.exif, imageFormat);
  return {
    format: imageFormat,
    all: allJsonObject,
    exif: exifJsonObject,
    icc: metadata.icc === undefined ? undefined : parseIcc(metadata.icc),
    iptc: exifrExifAndIptc === undefined ? undefined : exifrExifAndIptc.iptc,
    xmp: metadata.xmp === undefined ? undefined : new XMLParser().parse(metadata.xmp.toString()),
    tiffTagPhotoshop: metadata.tifftagPhotoshop?.toString(),
    width: metadata.width,
    height: metadata.height
  };
}

async function stripMetadataWithSharp(image: Buffer): Promise<Buffer>
{
  const theSharp: sharp.Sharp = sharp(image, computeSharpOptions());
  return await theSharp.toBuffer();
}

function stripMetadataWithPiexif(image: Buffer): Buffer
{
  const binaryImage = image.toString("binary");
  const dataUrl: string = piexif.remove(binaryImage);
  return Buffer.from(dataUrl, "binary");
}

function stripMetadataWithExifRemove(image: Buffer)
{
  return exifremove.remove(image);
}

async function stripMetadataWithExifBeGone(image: Buffer): Promise<Buffer>
{
  const duplex: Duplex = new Duplex();
  duplex.push(image);
  duplex.push(null);
  const reader: stream.Readable = duplex;
  const exifTransformer: ExifTransformer = new ExifTransformer();
  const piped: ExifTransformer = reader.pipe(exifTransformer);
  return await new Promise<Buffer>((resolve, reject) =>
  {
    const chunks: Buffer[] = [];
    piped.on("data", (data: Buffer) =>
    {
      chunks.push(data);
    });
    piped.on("end", () =>
    {
      resolve(Buffer.concat(chunks));
    });
    piped.on("error", reject);
  });
}

export async function stripMetadata(image: Buffer, imageFormat: ImageFormat, algorithm: ImageMetadataAlgorithm = ImageMetadataAlgorithm.internal, types: ImageMetadataType[] = [ImageMetadataType.ALL]): Promise<Buffer>
{
  switch (imageFormat)
  {
    default:
      throw new Error(`Unsupported image format '${imageFormat}' for stripping metadata`);
    case ImageFormat.PNG:
      if (algorithm !== ImageMetadataAlgorithm.internal)
      {
        throw new Error(`Unsupported algorithm '${algorithm}' for stripping metadata of a PNG image`);
      }
      if (types.length === 0 || types[0] !== ImageMetadataType.ALL)
      {
        throw new Error(`When stripping the metadata of a PNG image, only the stripping of all metadata is supported`);
      }
      // An insightful article about the structure of a PNG file is available at https://medium.com/@0xwan/png-structure-for-beginner-8363ce2a9f73
      const chunks: { name: string, data: Uint8Array }[] = extractChunks(image);
      const toBeStrippedChunkNames: string [] = [pngMetadataText];
      const filteredChunks: { name: string, data: Uint8Array }[] = chunks.filter((chunk) =>
      {
        return toBeStrippedChunkNames.indexOf(chunk.name) === -1;
      });
      // @ts-ignore
      const uint8Array = encodeChunks(filteredChunks);
      return Buffer.from(uint8Array);
    case ImageFormat.JPEG:
      if (algorithm === ImageMetadataAlgorithm.internal)
      {
        const buffer = stripMetadataWithExifRemove(image);
        const all = types.indexOf(ImageMetadataType.ALL) !== -1;
        const noExifBuffer = (all === false && types.indexOf(ImageMetadataType.ICC) === -1) ? buffer : stripIccMetadata(buffer);
        const noIpccBuffer = (all == false && types.indexOf(ImageMetadataType.IPTC) === -1) ? noExifBuffer : stripIptcMetadata(noExifBuffer);
        const noXmpBuffer = (all == false && types.indexOf(ImageMetadataType.XMP) === -1) ? noIpccBuffer : stripXmpMetadata(noIpccBuffer);
        // noinspection UnnecessaryLocalVariableJS
        const noIptcBuffer = (all == false && types.indexOf(ImageMetadataType.JFIF) === -1) ? noXmpBuffer : stripJpegJfifMetadata(noXmpBuffer);
        return noIptcBuffer;
      }
      else
      {
        if (types.length === 0 || types[0] !== ImageMetadataType.ALL)
        {
          throw new Error(`When resorting to the '${algorithm}' algorithm, only the stripping of all metadata is supported`);
        }
        switch (algorithm)
        {
          default:
            throw new Error(`Unsupported algorithm '${algorithm}' for stripping metadata of a JPEG image`);
          case ImageMetadataAlgorithm.sharp:
            return await stripMetadataWithSharp(image);
          case ImageMetadataAlgorithm.piexif:
            return stripMetadataWithPiexif(image);
          case ImageMetadataAlgorithm.exifremove:
            return stripMetadataWithExifRemove(image);
          case ImageMetadataAlgorithm.exifbegone:
            return await stripMetadataWithExifBeGone(image);
        }
      }
  }
}

function writeMetadataPng(buffer: Buffer, metadata: Record<string, string>): Buffer
{
  const viaMetaPng = Math.random() > 1;
  if (viaMetaPng === true)
  {
    let array: Uint8Array = buffer;
    for (const key of Object.keys(metadata))
    {
      const value = metadata[key];
      array = addMetadata(array, key, value);
    }
    return Buffer.from(array);
  }
  else
  {
    // @ts-ignore
    return pngWriteMetadata(buffer, { [pngMetadataText]: metadata });
  }
}

// A library for writing JPEG XMP metadata is "jpeg-xmp-writer", see https://github.com/Mtillmann/jpeg-xmp-writer
function writeMetadataJpeg(buffer: Buffer, metadata: Record<string, string>): Buffer
{
  const encoding = "binary";
  const base64Image = buffer.toString(encoding);
  const newExif = { Exif: metadata };
  // noinspection JSUnresolvedReference,JSVoidFunctionReturnValueUsed
  const newBase64Image = piexif.insert(piexif.dump(newExif), base64Image);
  return Buffer.from(newBase64Image, encoding);
}

export async function writeMetadata(filePathOrBuffer: string | Buffer, imageFormat: ImageFormat, metadata: Record<string, string>): Promise<Buffer>
{
  const buffer: Buffer = Buffer.isBuffer(filePathOrBuffer) === true ? filePathOrBuffer as Buffer : fs.readFileSync(filePathOrBuffer);
  switch (imageFormat)
  {
    case ImageFormat.PNG:
      return writeMetadataPng(buffer, metadata);
    case ImageFormat.JPEG:
      return writeMetadataJpeg(buffer, metadata);
    default:
      throw new Error(`Unsupported image format '${imageFormat}' for writing metadata`);
  }
}

export function supportsApplicationMedata(imageFormat: ImageFormat)
{
  return imageFormat === ImageFormat.PNG || imageFormat === ImageFormat.JPEG;
}

export async function readApplicationMetadata(filePathOrBuffer: string | Buffer, imageFormat: ImageFormat): Promise<Json | undefined>
{
  const options =
    {
      mergeOutput: false,
      jfif: false,
      exif: false,
      ihdr: imageFormat === ImageFormat.PNG
    };
  const all = await parseExifr(filePathOrBuffer, options);
  cleanExifProperties(all);
  let string: string;
  switch (imageFormat)
  {
    case ImageFormat.PNG:
    {
      if (all === undefined || all.ihdr === undefined || all.ihdr[applicationMetadataPropertyName] === undefined)
      {
        return undefined;
      }
      string = all.ihdr[applicationMetadataPropertyName];
      break;
    }
    case ImageFormat.JPEG:
    {
      if (all === undefined || all.ifd0 === undefined || all.ifd0[piexifTargetPrinter] === undefined)
      {
        return undefined;
      }
      string = all.ifd0[piexifTargetPrinter];
      break;
    }
    default:
      throw new Error(`Unsupported image format '${imageFormat}' for reading the application metadata`);
  }
  {
    // We handle the case when the string was encoded in base64
    const buffer = Buffer.from(string, "base64");
    if (buffer.toString("base64") === string)
    {
      // This is a base64-encoded value
      string = buffer.toString();
    }
  }
  let json: Json;
  try
  {
    json = JSON.parse(string);
  }
  catch (error)
  {
    logger.warn("Could not parse the application metadata in JSON");
    return undefined;
  }
  switch (imageFormat)
  {
    case ImageFormat.PNG:
      return json;
    case ImageFormat.JPEG:
      return json[applicationMetadataPropertyName];
  }
}

export async function writeApplicationMetadata(filePathOrBuffer: string | Buffer, imageFormat: ImageFormat, metadata: Json): Promise<Buffer>
{
  const buffer: Buffer = Buffer.isBuffer(filePathOrBuffer) === true ? filePathOrBuffer as Buffer : fs.readFileSync(filePathOrBuffer);

  function encodeInBase64IfNecessary(string: string)
  {
    return /^[\x00-\xFF]+$/.test(string) === false ? Buffer.from(string).toString("base64") : string;
  }

  switch (imageFormat)
  {
    case ImageFormat.PNG:
      // @ts-ignore
      return writeMetadataPng(buffer, { [applicationMetadataPropertyName]: encodeInBase64IfNecessary(JSON.stringify(metadata)) });
    case ImageFormat.JPEG:
      // The documentation about the JPEG metadata markers is available at https://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_JPEG_files and the one about EXIF metadata is available at https://exiftool.org/TagNames/EXIF.html
      const base64 = "base64";
      const dataUrl = `data:image/jpeg;${base64},${buffer.toString(base64)}`;
      const previousExif = piexif.load(dataUrl);
      cleanExifProperties(previousExif);
      const zerothProfile = "0th";
      const newZerothValue = previousExif[zerothProfile] === undefined ? {} : previousExif[zerothProfile];
      newZerothValue[targetPrinterId] = encodeInBase64IfNecessary(JSON.stringify({ [applicationMetadataPropertyName]: metadata }));
      // const exifProfile = "Exif";
      // const newZExifValue = previousExif[exifProfile] === undefined ? {} : previousExif[exifProfile];
      // newZExifValue[piexif.ExifIFD.OffsetTimeOriginal] = "+00:00";
      // const newExif = { ...previousExif, [exifProfile]: newZExifValue, [zerothProfile]: newZerothValue };
      const newExif = { ...previousExif, [zerothProfile]: newZerothValue };
      const encoding = "binary";
      const base64Image = buffer.toString(encoding);
      // noinspection JSVoidFunctionReturnValueUsed
      const newBase64Image = piexif.insert(piexif.dump(newExif), base64Image);
      return Buffer.from(newBase64Image, encoding);
    default:
      throw new Error(`Unsupported image format '${imageFormat}' for writing the application metadata`);
  }
}


async function extractBufferFromAvif(buffer: Buffer): Promise<Buffer>
{
  // TODO: implement this properly with a dedicated AVIF decodec library
  return buffer;
}

async function extractBufferFromHeif(buffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }>
{
  // @ts-ignore
  const arrayBufferLike: ArrayBufferLike = buffer;
  const images = await heicDecode.all({ buffer: arrayBufferLike });
  if (images.length !== 1)
  {
    throw new ImageError(`The image contains several frames`, ErrorCause.NotImplemented);
  }
  const image = images[0];
  const { data, width, height } = await image.decode();
  const outputBuffer = Buffer.from(data);
  return { buffer: outputBuffer, width, height };
}

export type FormatAndBuffer =
  {
    format: DefinedResizeFormat,
    buffer: Buffer
  };

export async function guessFormat(entity: string, input: string | Buffer): Promise<DefinedResizeFormat>
{
  let metadata: Metadata;
  try
  {
    metadata = await sharp(input, computeSharpOptions()).metadata();
  }
  catch (error)
  {
    throw new ImageError(`Unable to parse the metadata for the ${entity}. Reason: '${(error as Error).message}'`, ErrorCause.InvalidImage);
  }
  if (metadata.format === undefined)
  {
    throw new ImageError(`Cannot determine the format of the ${entity}`, ErrorCause.Internal);
  }
  const format: ImageFormat = translateImageFormat(metadata.format, metadata.compression);
  logger.debug(`The ${entity} format is '${format}'`);
  return format;
}


export async function resize(entity: string, input: string | Buffer, format: ResizeFormat, width: number | undefined, height: number | undefined, render: ResizeRender, quality: NumericRange<1, 100> | undefined, effort: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined, enlargeable: boolean | undefined, keepMetadata: boolean | undefined): Promise<FormatAndBuffer>
{
  // The documentation about "sharp" is available at https://sharp.pixelplumbing.com
  // It is important to set the "failOnError" flag to "false", otherwise a popup dialog box occurs when the image seems to be corrupted (discussion at https://github.com/lovell/sharp/issues/793, documentation at http://sharp.pixelplumbing.com/en/stable/api-constructor/)
  const sharpOptions: sharp.SharpOptions = computeSharpOptions();
  const options: ResizeOptions =
    {
      withoutEnlargement: enlargeable === false
    };
  if (render !== undefined)
  {
    let fit: keyof FitEnum;
    switch (render)
    {
      case "inbox":
      default:
        fit = "inside";
        break;
      case "outbox":
        fit = "outside";
        break;
      case "crop":
        fit = "cover";
        break;
      case "map":
        fit = "fill";
        break;
    }
    options.fit = fit;
  }
  const inputBuffer: Buffer = Buffer.isBuffer(input) === true ? input as Buffer : fs.readFileSync(input as string);
  const originalFormat = await guessFormat(entity, inputBuffer);
  let currentBuffer: Buffer = inputBuffer;
  if (originalFormat === "AVIF" || originalFormat === "HEIF")
  {
    logger.debug(`Converting the ${entity} in PNG format`);
    if (originalFormat === "AVIF")
    {
      currentBuffer = await extractBufferFromAvif(currentBuffer);
    }
    else if (originalFormat === "HEIF")
    {
      // Because we know that the conversion of an image from the HEIF to the PNG format does not work, we introduce this work-around, see https://github.com/lovell/sharp/issues/4050
      const { buffer, width, height } = await extractBufferFromHeif(currentBuffer);
      currentBuffer = buffer;
      sharpOptions.raw =
        {
          width: width,
          height: height,
          channels: 4
        };
    }
  }
  if (format === undefined)
  {
    format = originalFormat;
  }

  const theSharp: sharp.Sharp = sharp(currentBuffer, sharpOptions);
  const resized: sharp.Sharp = theSharp.resize(width, height, options);

  let formatted: sharp.Sharp;
  switch (format)
  {
    default:
      throw new ImageError(`The image format '${format}' is not supported`, ErrorCause.NotImplemented);
    case "JPEG":
      formatted = resized.jpeg({ quality });
      break;
    case "PNG":
      formatted = resized.png({ effort: effort ?? 6 });
      break;
    case "WEBP":
      formatted = resized.webp({ quality, lossless: false, effort: effort ?? 3 });
      break;
    case "GIF":
      formatted = resized.gif({ effort: effort ?? 6 });
      break;
    case "AVIF":
      formatted = resized.avif({ quality, lossless: false, effort: effort ?? 3 });
      break;
    case "HEIF":
      // We force the compression to "av1", because it seems that the "libvips" library is not installed, as described on https://github.com/lovell/sharp/issues/3346
      formatted = resized.heif({ quality, lossless: false, effort: effort ?? 3, compression: "av1" });
      break;
  }
  try
  {
    const sharpMetadata: sharp.Sharp = keepMetadata !== true ? formatted : formatted.keepMetadata();
    const buffer: Buffer = await sharpMetadata.toBuffer();
    return { format: format as DefinedResizeFormat, buffer };
  }
  catch (error)
  {
    // It is very likely that the input image is not an image or its format is not supported
    throw new ImageError(`An unexpected error occurred while attempting to resize with the format '${format}' the ${entity}. Reason: '${(error as Error).message}'`, ErrorCause.Internal);
  }
}

// We do not want any caching, see the documentation at https://sharp.pixelplumbing.com/en/stable/api-utility/
sharp.cache(false);
