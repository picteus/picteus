import { test } from "node:test";
import { strict as assert } from "node:assert/strict";

import type { CollapsibleGroupElement, TableElement, TableRow } from "@picteus/extension-sdk";

import { MidjourneyInstructions } from "./instructions";


test("All", () =>
{
  const metadataJsonString = `{"ImageWidth":960,"ImageHeight":1200,"BitDepth":8,"ColorType":"RGB","Compression":"Deflate/Inflate","Filter":"Adaptive","Interlace":"Noninterlaced","Creation Time":"Thu, 20 Jun 2024 22:50:03 GMT","Author":"Grand Daron","Description":"https://s.mj.run/jhiJzyVBla8 Editorial fashion, photo by Tim Walker, Biomechatronic Chanel girl model within shimmering platinum fluid in code, made of fusion of antimatter, binary code, transistor, microphone, hard drive, static, fiber optics, in designer fashion style --chaos 16 --ar 4:5 --sref 4169606994 --personalize yfbxsj7 Job ID: d95be554-d446-4c51-ad75-e00d9f9bbb35","DigImageGUID":"d95be554-d446-4c51-ad75-e00d9f9bbb35","DigitalSourceType":"https://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"}`;
  const instructions = MidjourneyInstructions.parseMetadata(JSON.parse(metadataJsonString));

  assert.ok(instructions);

  if (instructions !== undefined)
  {
    assert.equal(instructions.author, "Grand Daron");
    assert.ok(Math.abs((instructions.aspectRatio ?? 0) - 0.8) < 0.001);
    assert.equal(instructions.guid, "d95be554-d446-4c51-ad75-e00d9f9bbb35");
    assert.equal(instructions.creationDate, Date.parse("Thu, 20 Jun 2024 22:50:03 GMT"));
    assert.ok(instructions.url);

    const uiContainer = instructions.toUiContainer();
    assert.ok(uiContainer);
    assert.equal(uiContainer.schemaVersion, "1.0");

    const elements = uiContainer.elements;
    assert.equal(elements.length, 2);

    // Primary section is a 2-column table
    assert.equal(elements[0].type, "table");
    const primaryTable = elements[0] as TableElement;
    assert.ok(primaryTable.rows.length > 0);
    assert.equal(primaryTable.rows[0].cells.length, 2);

    const primaryPropertyNames = primaryTable.rows.map(
      (row: TableRow) =>
      {
        return (row.cells[0] as { value?: string }).value;
      }
    );
    assert.ok(primaryPropertyNames.includes("Prompt"));
    // Command is shifted to the second section, so not in primary section
    assert.equal(primaryPropertyNames.includes("Command"), false);

    // Secondary section is a collapsible group
    assert.equal(elements[1].type, "collapsible-group");
    const collapsibleGroup = elements[1] as CollapsibleGroupElement;

    assert.equal(collapsibleGroup.title, "Details");
    assert.equal(collapsibleGroup.defaultExpanded, false);
    assert.equal(collapsibleGroup.elements.length, 1);

    // Inside collapsible group is a 2-column table
    const secondaryTable = collapsibleGroup.elements[0] as TableElement;
    assert.equal(secondaryTable.type, "table");
    assert.ok(secondaryTable.rows.length > 0);
    assert.equal(secondaryTable.rows[0].cells.length, 2);

    const secondaryPropertyNames = secondaryTable.rows.map(
      (row: TableRow) =>
      {
        return (row.cells[0] as { value?: string }).value;
      }
    );
    assert.ok(secondaryPropertyNames.includes("Command"));
    assert.ok(secondaryPropertyNames.includes("Chaos"));
    assert.ok(secondaryPropertyNames.includes("Seed"));
    assert.ok(secondaryPropertyNames.includes("Profile"));
    assert.ok(secondaryPropertyNames.includes("Digital Source"));

    // Verify valid serialization
    const jsonString = uiContainer.toString();
    const parsed = JSON.parse(jsonString);
    assert.equal(parsed.schemaVersion, "1.0");
    assert.equal(parsed.elements.length, elements.length);
  }
});

test("Parse aspect ratio", () =>
{
  const assertCloseTo = (actual: number, expected: number, delta = 0.001): void =>
  {
    assert.ok(Math.abs(actual - expected) < delta, `Expected ${actual} to be close to ${expected}`);
  };

  assertCloseTo(MidjourneyInstructions.parseAspectRatio("2:3"), 2 / 3);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("16:9"), 16 / 9);
  assert.equal(MidjourneyInstructions.parseAspectRatio("1"), 1);
  assert.equal(MidjourneyInstructions.parseAspectRatio("1:1"), 1);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("4:5"), 0.8);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("3:2"), 1.5);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("7:4"), 1.75);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("1.85:1"), 1.85);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("16/9"), 16 / 9);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio(" 2 : 3 "), 2 / 3);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("16x9"), 16 / 9);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("16X9"), 16 / 9);
  assert.ok(Number.isNaN(MidjourneyInstructions.parseAspectRatio("invalid")));
  assert.ok(Number.isNaN(MidjourneyInstructions.parseAspectRatio("")));
  assert.ok(Number.isNaN(MidjourneyInstructions.parseAspectRatio("0:0")));
  assert.ok(Number.isNaN(MidjourneyInstructions.parseAspectRatio("1:0")));
  assert.ok(Number.isNaN(MidjourneyInstructions.parseAspectRatio("-1:1")));
  assert.ok(Number.isNaN(MidjourneyInstructions.parseAspectRatio("1:-1")));
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("16:9"), 16 / 9);
  assertCloseTo(MidjourneyInstructions.parseAspectRatio("2:3"), 2 / 3);
  assert.equal(MidjourneyInstructions.parseAspectRatio("1"), 1);
});
