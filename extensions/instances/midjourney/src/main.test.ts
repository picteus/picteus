import { test } from "node:test";
import { strict as assert } from "node:assert/strict";

import type {
  CollapsibleGroupElement,
  FlowingElement,
  ImageReferenceElement,
  TableElement,
  TableRow,
  UiContainerClass
} from "@picteus/extension-sdk";

import { MidjourneyInstructions } from "./instructions";


const DEFAULT_CREATION_TIME = "Thu, 20 Jun 2024 22:50:03 GMT";
const DEFAULT_AUTHOR = "Author";
const DEFAULT_GUID = "d95be554-d446-4c51-ad75-e00d9f9bbb35";
const DEFAULT_SOURCE = "trainedAlgorithmicMedia";
const REFERENCE_IMAGE_EDGE = 75;


function assertCloseTo(actual: number | undefined, expected: number, delta = 0.001): void
{
  assert.ok(actual !== undefined && Math.abs(actual - expected) < delta, `Expected ${actual} to be close to ${expected}`);
}

function getTableRowLabel(row: TableRow): string | undefined
{
  return (row.cells[0] as { value?: string }).value;
}

function getTablePropertyNames(table: TableElement): (string | undefined)[]
{
  return table.rows.map(getTableRowLabel);
}

function findTableRow(table: TableElement, label: string): TableRow | undefined
{
  return table.rows.find((row: TableRow) => getTableRowLabel(row) === label);
}

function getPrimaryTable(uiContainer: UiContainerClass): TableElement
{
  const primaryElement = uiContainer.elements[0] as TableElement;
  assert.equal(primaryElement?.type, "table");
  return primaryElement;
}

function getSecondaryTable(uiContainer: UiContainerClass): TableElement
{
  const collapsibleGroup = uiContainer.elements[1] as CollapsibleGroupElement;
  assert.equal(collapsibleGroup?.type, "collapsible-group");
  const secondaryTable = collapsibleGroup.elements[0] as TableElement;
  assert.equal(secondaryTable?.type, "table");
  return secondaryTable;
}

function getImageReferences(flowingElement: FlowingElement): Array<{
  type: string;
  src: string;
  width: number;
  height: number
}>
{
  return flowingElement.elements.map((element) =>
  {
    const imageReference = element as ImageReferenceElement;
    return {
      type: element.type,
      src: imageReference.src,
      width: imageReference.width,
      height: imageReference.height
    };
  });
}

function createSampleInstructions(
  description: string,
  options?: {
    creationTime?: string;
    author?: string;
    guid?: string;
    source?: string;
  }
): MidjourneyInstructions
{
  return MidjourneyInstructions.parse(
    options?.creationTime ?? DEFAULT_CREATION_TIME,
    options?.author ?? DEFAULT_AUTHOR,
    description,
    options?.guid ?? DEFAULT_GUID,
    options?.source ?? DEFAULT_SOURCE
  );
}


test("All", () =>
{
  const metadataJsonString = `{"ImageWidth":960,"ImageHeight":1200,"BitDepth":8,"ColorType":"RGB","Compression":"Deflate/Inflate","Filter":"Adaptive","Interlace":"Noninterlaced","Creation Time":"${DEFAULT_CREATION_TIME}","Author":"${DEFAULT_AUTHOR}","Description":"https://s.mj.run/jhiJzyVBla8 Editorial fashion, photo by Tim Walker, Biomechatronic Chanel girl model within shimmering platinum fluid in code, made of fusion of antimatter, binary code, transistor, microphone, hard drive, static, fiber optics, in designer fashion style --chaos 16 --ar 4:5 --sref 4169606994 --personalize yfbxsj7 Job ID: ${DEFAULT_GUID}","DigImageGUID":"${DEFAULT_GUID}","DigitalSourceType":"https://cv.iptc.org/newscodes/digitalsourcetype/${DEFAULT_SOURCE}"}`;
  const instructions = MidjourneyInstructions.parseMetadata(JSON.parse(metadataJsonString));

  assert.ok(instructions);

  if (instructions !== undefined)
  {
    assert.equal(instructions.author, DEFAULT_AUTHOR);
    assertCloseTo(instructions.aspectRatio, 0.8);
    assert.equal(instructions.guid, DEFAULT_GUID);
    assert.equal(instructions.creationDate, Date.parse(DEFAULT_CREATION_TIME));
    assert.ok(instructions.url);
    assert.deepEqual(instructions.referenceAssets, [ "https://s.mj.run/jhiJzyVBla8" ]);
    assert.equal(instructions.prompt.includes("https://s.mj.run/"), false);

    const uiContainer = instructions.toUiContainer();
    assert.ok(uiContainer);
    assert.equal(uiContainer.schemaVersion, "1.0");

    const elements = uiContainer.elements;
    assert.equal(elements.length, 2);

    // Primary section is a 2-column table
    const primaryTable = getPrimaryTable(uiContainer);
    assert.ok(primaryTable.rows.length > 0);
    assert.equal(primaryTable.rows[0].cells.length, 2);

    const primaryPropertyNames = getTablePropertyNames(primaryTable);
    assert.ok(primaryPropertyNames.includes("Prompt"));
    assert.ok(primaryPropertyNames.includes("Reference Assets"));
    assert.deepEqual(primaryPropertyNames.slice(0, 2), [ "Prompt", "Reference Assets" ]);
    // Command is shifted to the second section, so not in primary section
    assert.equal(primaryPropertyNames.includes("Command"), false);

    // Secondary section is a collapsible group
    const collapsibleGroup = elements[1] as CollapsibleGroupElement;
    assert.equal(collapsibleGroup.title, "Details");
    assert.equal(collapsibleGroup.defaultExpanded, false);
    assert.equal(collapsibleGroup.elements.length, 1);

    // Inside collapsible group is a 2-column table
    const secondaryTable = getSecondaryTable(uiContainer);
    assert.ok(secondaryTable.rows.length > 0);
    assert.equal(secondaryTable.rows[0].cells.length, 2);

    const secondaryPropertyNames = getTablePropertyNames(secondaryTable);
    assert.ok(secondaryPropertyNames.includes("Command"));
    assert.ok(secondaryPropertyNames.includes("Chaos"));
    assert.ok(secondaryPropertyNames.includes("Seed"));
    assert.ok(secondaryPropertyNames.includes("Profile"));
    assert.equal(secondaryPropertyNames.includes("Digital Source"), false);
    assert.equal(secondaryPropertyNames.includes("Job ID"), false);

    // Verify valid serialization
    const jsonString = uiContainer.toString();
    const parsed = JSON.parse(jsonString);
    assert.equal(parsed.schemaVersion, "1.0");
    assert.equal(parsed.elements.length, elements.length);
  }
});

test("Parse reference assets", () =>
{
  const instructions = createSampleInstructions(
    `https://s.mj.run/first a prompt https://s.mj.run/second --ar 16:9 Job ID: ${DEFAULT_GUID}`
  );

  assert.equal(instructions.prompt, "a prompt");
  assert.deepEqual(instructions.referenceAssets, [ "https://s.mj.run/first", "https://s.mj.run/second" ]);
  assert.equal(instructions.command.includes("https://s.mj.run/first"), true);

  const uiContainer = instructions.toUiContainer();
  const primaryTable = getPrimaryTable(uiContainer);
  const referenceAssetsRow = findTableRow(primaryTable, "Reference Assets");
  assert.ok(referenceAssetsRow);

  const referenceAssetsElement = referenceAssetsRow.cells[1] as FlowingElement;
  assert.equal(referenceAssetsElement.type, "flowing");
  assert.deepEqual(getImageReferences(referenceAssetsElement), [
    { type: "image-ref", src: "https://s.mj.run/first", width: REFERENCE_IMAGE_EDGE, height: REFERENCE_IMAGE_EDGE },
    { type: "image-ref", src: "https://s.mj.run/second", width: REFERENCE_IMAGE_EDGE, height: REFERENCE_IMAGE_EDGE }
  ]);

  const withoutReferenceAssets = createSampleInstructions(
    `a prompt --ar 16:9 Job ID: ${DEFAULT_GUID}`
  );
  assert.deepEqual(withoutReferenceAssets.referenceAssets, []);
  const withoutRefTable = getPrimaryTable(withoutReferenceAssets.toUiContainer());
  assert.equal(findTableRow(withoutRefTable, "Reference Assets"), undefined);
});

test("Parse aspect ratio", () =>
{
  const validAspectRatios: Array<[ string, number ]> =
    [
      [ "2:3", 2 / 3 ],
      [ "16:9", 16 / 9 ],
      [ "1", 1 ],
      [ "1:1", 1 ],
      [ "4:5", 0.8 ],
      [ "3:2", 1.5 ],
      [ "7:4", 1.75 ],
      [ "1.85:1", 1.85 ],
      [ "16/9", 16 / 9 ],
      [ " 2 : 3 ", 2 / 3 ],
      [ "16x9", 16 / 9 ],
      [ "16X9", 16 / 9 ]
    ];
  for (const [ input, expected ] of validAspectRatios)
  {
    assertCloseTo(MidjourneyInstructions.parseAspectRatio(input), expected);
  }

  const invalidAspectRatios = [ "invalid", "", "0:0", "1:0", "-1:1", "1:-1" ];

  for (const input of invalidAspectRatios)
  {
    assert.ok(Number.isNaN(MidjourneyInstructions.parseAspectRatio(input)), `Expected '${input}' to be NaN`);
  }
});
