import { expect, test } from "@jest/globals";
import { MidjourneyInstructions } from "./main";


test("All", async () =>
{
  const metadataJsonString = `{"ImageWidth":960,"ImageHeight":1200,"BitDepth":8,"ColorType":"RGB","Compression":"Deflate/Inflate","Filter":"Adaptive","Interlace":"Noninterlaced","Creation Time":"Thu, 20 Jun 2024 22:50:03 GMT","Author":"Grand Daron","Description":"https://s.mj.run/jhiJzyVBla8 Editorial fashion, photo by Tim Walker, Biomechatronic Chanel girl model within shimmering platinum fluid in code, made of fusion of antimatter, binary code, transistor, microphone, hard drive, static, fiber optics, in designer fashion style --chaos 16 --ar 4:5 --sref 4169606994 --personalize yfbxsj7 Job ID: d95be554-d446-4c51-ad75-e00d9f9bbb35","DigImageGUID":"d95be554-d446-4c51-ad75-e00d9f9bbb35","DigitalSourceType":"https://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"}`;
  const instructions = MidjourneyInstructions.parseMetadata(JSON.parse(metadataJsonString));

  expect(instructions).toBeDefined();

  if (instructions !== undefined)
  {
    expect(instructions.author).toBe("Grand Daron");
    expect(instructions.aspectRatio).toBeCloseTo(0.8);
    expect(instructions.guid).toBe("d95be554-d446-4c51-ad75-e00d9f9bbb35");
    expect(instructions.url).toBeDefined();
    const uiContainer = instructions.toUiContainer();
    expect(uiContainer).toBeDefined();
    expect(uiContainer.schemaVersion).toBe("1.0");

    const elements = uiContainer.elements;
    expect(elements.length).toBe(2);

    // Primary section is a 2-column table
    expect(elements[0].type).toBe("table");
    const primaryTable = elements[0] as {
      type: string;
      hasHeader?: boolean;
      rows: Array<{ cells: Array<{ type: string; value?: string }> }>;
    };
    expect(primaryTable.rows.length).toBeGreaterThan(0);
    expect(primaryTable.rows[0].cells.length).toBe(2);

    const primaryPropertyNames = primaryTable.rows.map((row) => row.cells[0].value);
    expect(primaryPropertyNames).toContain("Prompt");
    expect(primaryPropertyNames).toContain("Author");
    expect(primaryPropertyNames).toContain("Creation Date");
    expect(primaryPropertyNames).toContain("Aspect Ratio");
    // Command is shifted to the second section, so not in primary section
    expect(primaryPropertyNames).not.toContain("Command");

    // Secondary section is a collapsible group
    expect(elements[1].type).toBe("collapsible-group");
    const collapsibleGroup = elements[1] as {
      type: string;
      title: string;
      summary?: string;
      defaultExpanded?: boolean;
      elements: Array<{
        type: string;
        hasHeader?: boolean;
        rows: Array<{ cells: Array<{ type: string; value?: string }> }>;
      }>;
    };

    expect(collapsibleGroup.title).toBe("Details");
    expect(collapsibleGroup.defaultExpanded).toBe(false);
    expect(collapsibleGroup.elements.length).toBe(1);

    // Inside collapsible group is a 2-column table
    const secondaryTable = collapsibleGroup.elements[0];
    expect(secondaryTable.type).toBe("table");
    expect(secondaryTable.rows.length).toBeGreaterThan(0);
    expect(secondaryTable.rows[0].cells.length).toBe(2);

    const secondaryPropertyNames = secondaryTable.rows.map((row) => row.cells[0].value);
    expect(secondaryPropertyNames).toContain("Command");
    expect(secondaryPropertyNames).toContain("Chaos");
    expect(secondaryPropertyNames).toContain("Seed");
    expect(secondaryPropertyNames).toContain("Profile");
    expect(secondaryPropertyNames).toContain("Digital Source");

    // Verify valid serialization
    const jsonString = uiContainer.toString();
    const parsed = JSON.parse(jsonString);
    expect(parsed.schemaVersion).toBe("1.0");
    expect(parsed.elements.length).toBe(elements.length);
  }
});


test("Parse aspect ratio", async () =>
{
  expect(MidjourneyInstructions.parseAspectRatio("2:3")).toBeCloseTo(2 / 3);
  expect(MidjourneyInstructions.parseAspectRatio("16:9")).toBeCloseTo(16 / 9);
  expect(MidjourneyInstructions.parseAspectRatio("1")).toBe(1);
  expect(MidjourneyInstructions.parseAspectRatio("1:1")).toBe(1);
  expect(MidjourneyInstructions.parseAspectRatio("4:5")).toBeCloseTo(0.8);
  expect(MidjourneyInstructions.parseAspectRatio("3:2")).toBeCloseTo(1.5);
  expect(MidjourneyInstructions.parseAspectRatio("7:4")).toBeCloseTo(1.75);
  expect(MidjourneyInstructions.parseAspectRatio("1.85:1")).toBeCloseTo(1.85);
  expect(MidjourneyInstructions.parseAspectRatio("16/9")).toBeCloseTo(16 / 9);
  expect(MidjourneyInstructions.parseAspectRatio(" 2 : 3 ")).toBeCloseTo(2 / 3);
  expect(MidjourneyInstructions.parseAspectRatio("16x9")).toBeCloseTo(16 / 9);
  expect(MidjourneyInstructions.parseAspectRatio("16X9")).toBeCloseTo(16 / 9);
  expect(Number.isNaN(MidjourneyInstructions.parseAspectRatio("invalid"))).toBe(true);
  expect(Number.isNaN(MidjourneyInstructions.parseAspectRatio(""))).toBe(true);
  expect(Number.isNaN(MidjourneyInstructions.parseAspectRatio("0:0"))).toBe(true);
  expect(Number.isNaN(MidjourneyInstructions.parseAspectRatio("1:0"))).toBe(true);
  expect(Number.isNaN(MidjourneyInstructions.parseAspectRatio("-1:1"))).toBe(true);
  expect(Number.isNaN(MidjourneyInstructions.parseAspectRatio("1:-1"))).toBe(true);
  expect(MidjourneyInstructions.parseAspectRatio("16:9")).toBeCloseTo(16 / 9);
  expect(MidjourneyInstructions.parseAspectRatio("2:3")).toBeCloseTo(2 / 3);
  expect(MidjourneyInstructions.parseAspectRatio("1")).toBe(1);
});


