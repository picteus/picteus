declare module "http-constants";
declare module "piexifjs";
declare module "exifremove";
declare module "ps-tree";

declare module "file-type"
{
  export interface FileTypeResult
  {
    ext: string;
    mime: string;
  }

  export function fileTypeFromFile(filePath: string): Promise<FileTypeResult | undefined>;
}

