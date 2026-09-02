import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BadgeVariant,
  BaseActionElement,
  BaseUiElement,
  booleanBadge,
  buttonAction,
  ButtonActionElementClass,
  ButtonVariant,
  collapsibleGroup,
  createFeature,
  createFeatureBlock,
  divider,
  DividerStyle,
  dominantColors,
  externalLinkAction,
  Feature,
  FeatureBlock,
  html,
  isActionElement,
  isButtonActionElement,
  isJsonElement,
  isLabelValueRowElement,
  isStringShortElement,
  isTableElement,
  isUiElement,
  isXmlElement,
  json,
  labelValue,
  markdown,
  multiSlot,
  numberMeter,
  numberUnbounded,
  repeatingGroup,
  repeatingGroupEntry,
  slot,
  stringShort,
  StringShortElementClass,
  StringShortRepresentation,
  table,
  tableColumn,
  TableColumnAlign,
  tableRow,
  TextWeight,
  timestamp,
  TimestampFormat,
  xml
} from "../dist/typescript/featureViewGrammar.js";


describe("TypeScript FeatureBlock & Visual DSL Builder", () =>
{

  it("should construct Dominant Colors specimen using fluent builder", () =>
  {
    const block = FeatureBlock.builder("Dominant Colors")
      .description("Palette computed from image pixels")
      .addLabelValue("Dominant Palette", dominantColors([ "#2D3748", "#4A5568", "#CBD5E0" ]))
      .addLabelValue("Primary Hue", stringShort("Slate", {
        representation: StringShortRepresentation.chip,
        modifiers: { weight: TextWeight.heavy }
      }))
      .addLabelValue("Confidence", numberMeter(92, { minimum: 0, maximum: 100, unit: "%" }))
      .addDivider({ style: DividerStyle.hairline })
      .addAction(buttonAction("exportSwatches", "Export Palette", {
        variant: ButtonVariant.primary,
        parameters: { format: "ase" }
      }))
      .build();

    assert.equal(block.schemaVersion, "1.0");
    assert.equal(block.title, "Dominant Colors");
    assert.equal(block.description, "Palette computed from image pixels");
    assert.equal(block.elements.length, 4);

    const firstElement = block.elements[0];
    assert.ok(isUiElement(firstElement));
    if (isLabelValueRowElement(firstElement))
    {
      assert.equal(firstElement.label, "Dominant Palette");
      assert.equal(firstElement.value.type, "color-set");
    }
    else
    {
      assert.fail("Expected first element to be LabelValueRowElement");
    }

    assert.ok(block.actions && block.actions.length === 1);
    const action = block.actions[0];
    assert.ok(isActionElement(action));
    if (isButtonActionElement(action))
    {
      assert.equal(action.commandId, "exportSwatches");
      assert.equal(action.variant, ButtonVariant.primary);
    }
    else
    {
      assert.fail("Expected action to be ButtonActionElement");
    }
  });

  it("should construct Metadata specimen using functional DSL factories", () =>
  {
    const block = createFeatureBlock(
      "Image Metadata",
      {
        description: "EXIF and camera properties",
        elements: [
          labelValue("Camera Model", stringShort("Sony Alpha 7 IV", { modifiers: { copyable: true } })),
          labelValue("Shutter Speed", stringShort("1/250s")),
          labelValue("Aperture", stringShort("f/2.8")),
          labelValue("ISO Rating", numberUnbounded(400, { unit: "ISO" })),
          labelValue("Capture Time", timestamp("2026-08-31T14:30:00Z", { format: TimestampFormat.full })),
          collapsibleGroup(
            "Detailed EXIF",
            [
              labelValue("Focal Length", stringShort("35mm")),
              labelValue("Metering Mode", stringShort("Multi-segment")),
              labelValue("Flash Fired", booleanBadge(false, { falseLabel: "No Flash", variant: BadgeVariant.neutral }))
            ],
            { summary: "3 extra fields", defaultExpanded: false }
          ),
          divider({ style: DividerStyle.dashed })
        ],
        actions: [
          buttonAction("copyJson", "Copy Raw JSON", { variant: ButtonVariant.secondary }),
          externalLinkAction("https://example.com/exif", "EXIF Specification")
        ]
      }
    );

    assert.equal(block.elements.length, 7);
    assert.equal(block.elements[0].type, "label-value");
    assert.equal(block.elements[5].type, "collapsible-group");
    assert.equal(block.elements[6].type, "divider");
    assert.equal(block.actions?.length, 2);
  });

  it("should build structured Table and MultiSlot layouts", () =>
  {
    const tbl = table(
      [
        tableRow([ stringShort("Resolution"), stringShort("3840 x 2160") ]),
        tableRow([ stringShort("Color Space"), stringShort("sRGB") ])
      ],
      {
        columns: [
          tableColumn({ header: "Property", align: TableColumnAlign.left }),
          tableColumn({ header: "Value", align: TableColumnAlign.right })
        ],
        hasHeader: true,
        isStriped: true,
        withColumnSeparators: true,
        withRowSeparators: true
      }
    );

    assert.ok(isTableElement(tbl));
    assert.equal(tbl.type, "table");
    assert.equal(tbl.isStriped, true);
    assert.equal(tbl.withColumnSeparators, true);
    assert.equal(tbl.withRowSeparators, true);
    assert.equal(tbl.rows.length, 2);
    assert.ok(tbl.columns && tbl.columns.length === 2);
    assert.equal(tbl.columns[1].align, TableColumnAlign.right);

    const multi = multiSlot(
      [
        slot(stringShort("Slot 1"), { width: "1/3" }),
        slot(stringShort("Slot 2"), { width: "2/3" })
      ],
      { proportions: "1/3 + 2/3" }
    );

    assert.equal(multi.type, "multi-slot");
    assert.equal(multi.slots.length, 2);
    assert.equal(multi.proportions, "1/3 + 2/3");
  });

  it("should build repeating group elements", () =>
  {
    const rep = repeatingGroup(
      [
        repeatingGroupEntry("Layer 1", { value: stringShort("Background") }),
        repeatingGroupEntry("Layer 2", { value: stringShort("Text Overlay") })
      ],
      { title: "Composition Layers" }
    );

    assert.equal(rep.type, "repeating-group");
    assert.equal(rep.title, "Composition Layers");
    assert.equal(rep.entries.length, 2);
    assert.equal(rep.entries[0].label, "Layer 1");
  });

  it("should support escape hatches and structured data (Markdown, HTML, XML, and JSON) with BaseModifiers", () =>
  {
    const md = markdown("### Heading\n- Item 1\n- Item 2", { modifiers: { copyable: true } });
    assert.equal(md.type, "markdown");
    assert.equal(md.content, "### Heading\n- Item 1\n- Item 2");
    assert.equal(md.modifiers?.copyable, true);

    const ht = html("<div class='custom-widget'>Content</div>", { modifiers: { copyable: false } });
    assert.equal(ht.type, "html");
    assert.equal(ht.content, "<div class='custom-widget'>Content</div>");
    assert.equal(ht.modifiers?.copyable, false);

    const xmlElem = xml("<root><item id='1'>Value</item></root>", { modifiers: { copyable: true } });
    assert.equal(xmlElem.type, "xml");
    assert.equal(xmlElem.value, "<root><item id='1'>Value</item></root>");
    assert.equal(xmlElem.modifiers?.copyable, true);

    const jsonElem = json("{\"key\": \"value\", \"count\": 42}", { modifiers: { copyable: true } });
    assert.equal(jsonElem.type, "json");
    assert.equal(jsonElem.value, "{\"key\": \"value\", \"count\": 42}");
    assert.equal(jsonElem.modifiers?.copyable, true);
  });

  it("should validate all type guards correctly", () =>
  {
    const short = stringShort("Test");
    assert.ok(isUiElement(short));
    assert.ok(isStringShortElement(short));
    assert.equal(isTableElement(short), false);

    const xmlElem = xml("<data/>");
    assert.ok(isXmlElement(xmlElem));
    assert.equal(isJsonElement(xmlElem), false);

    const jsonElem = json("{}");
    assert.ok(isJsonElement(jsonElem));
    assert.equal(isXmlElement(jsonElem), false);

    const btn = buttonAction("cmd", "Click Me");
    assert.ok(isActionElement(btn));
    assert.ok(isButtonActionElement(btn));

    assert.equal(isUiElement(null), false);
    assert.equal(isUiElement("not an object"), false);
    assert.equal(isActionElement({ notAnAction: true }), false);
  });

  it("should serialize cleanly to JSON string matching schema shape", () =>
  {
    const block = FeatureBlock.builder("JSON Test")
      .addLabelValue("Key", stringShort("Value"))
      .build();

    const json = JSON.stringify(block);
    const parsed = JSON.parse(json);

    assert.equal(parsed.schemaVersion, "1.0");
    assert.equal(parsed.title, "JSON Test");
    assert.equal(parsed.elements[0].type, "label-value");
    assert.equal(parsed.elements[0].label, "Key");
    assert.equal(parsed.elements[0].value.type, "string-short");
    assert.equal(parsed.elements[0].value.value, "Value");
  });

  it("should support instantiated classes implementing element interfaces", () =>
  {
    const shortClass = new StringShortElementClass("Class Value", { representation: StringShortRepresentation.chip });
    assert.ok(shortClass instanceof BaseUiElement);
    assert.ok(shortClass instanceof StringShortElementClass);
    assert.equal(shortClass.type, "string-short");
    assert.equal(shortClass.value, "Class Value");
    assert.equal(shortClass.representation, StringShortRepresentation.chip);
    assert.ok(isUiElement(shortClass));
    assert.ok(isStringShortElement(shortClass));

    const btnClass = new ButtonActionElementClass("export", "Export", { variant: ButtonVariant.primary });
    assert.ok(btnClass instanceof BaseActionElement);
    assert.ok(btnClass instanceof ButtonActionElementClass);
    assert.equal(btnClass.type, "button");
    assert.equal(btnClass.commandId, "export");
    assert.equal(btnClass.label, "Export");
    assert.ok(isActionElement(btnClass));
    assert.ok(isButtonActionElement(btnClass));

    const json = JSON.stringify(shortClass.toJSON());
    assert.equal(json, "{\"type\":\"string-short\",\"value\":\"Class Value\",\"representation\":\"chip\"}");
  });

  it("should construct Feature container using Feature fluent builder and functional helper", () =>
  {
    const feat = Feature.builder()
      .addLabelValue("Key", stringShort("Value"))
      .addAction(buttonAction("export", "Export"))
      .build();

    assert.equal(feat.schemaVersion, "1.0");
    assert.equal(feat.elements.length, 1);
    assert.equal(feat.elements[0].type, "label-value");
    assert.equal(feat.actions?.length, 1);

    const featHelper = createFeature({
      elements: [ labelValue("Direct", stringShort("Text")) ]
    });
    assert.equal(featHelper.schemaVersion, "1.0");
    assert.equal(featHelper.elements.length, 1);
  });

});
