import { getPalette } from "colorthief";


export interface RGBColor
{
  r: number;
  g: number;
  b: number;
}

export type ColorLibrary = "color-thief" | "colorlip" | "node-vibrant";

export interface IColorExtractor
{
  extractColors(imageBuffer: Buffer, count: number): Promise<RGBColor[]>;
}

class ColorThiefExtractor implements IColorExtractor
{

  async extractColors(imageBuffer: Buffer, count: number): Promise<RGBColor[]>
  {
    const palette = await getPalette(imageBuffer, { colorCount: count });
    return palette
      .slice()
      .sort((first, second) => second.population - first.population)
      .map((color) =>
      {
        const [r, g, b] = color.array();
        return { r, g, b };
      });
  }

}

export function createColorExtractor(library: ColorLibrary): IColorExtractor
{
  if (library === "color-thief")
  {
    return new ColorThiefExtractor();
  }
  throw new Error(`The color extraction library '${library}' is not yet supported by this version of the extension`);
}
