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
  FeatureBlockClass,
  FeatureClass,
  GrammarNode,
  html,
  isActionElement,
  isButtonActionElement,
  isFeature,
  isFeatureBlock,
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
  parseFeature,
  parseFeatureBlock,
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
    const tableElement = table(
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

    assert.ok(isTableElement(tableElement));
    assert.equal(tableElement.type, "table");
    assert.equal(tableElement.isStriped, true);
    assert.equal(tableElement.withColumnSeparators, true);
    assert.equal(tableElement.withRowSeparators, true);
    assert.equal(tableElement.rows.length, 2);
    assert.ok(tableElement.columns && tableElement.columns.length === 2);
    assert.equal(tableElement.columns[1].align, TableColumnAlign.right);

    const multiSlotElement = multiSlot(
      [
        slot(stringShort("Slot 1"), { width: "1/3" }),
        slot(stringShort("Slot 2"), { width: "2/3" })
      ],
      { proportions: "1/3 + 2/3" }
    );

    assert.equal(multiSlotElement.type, "multi-slot");
    assert.equal(multiSlotElement.slots.length, 2);
    assert.equal(multiSlotElement.proportions, "1/3 + 2/3");
  });

  it("should build repeating group elements", () =>
  {
    const repeatingGroupElement = repeatingGroup(
      [
        repeatingGroupEntry("Layer 1", { value: stringShort("Background") }),
        repeatingGroupEntry("Layer 2", { value: stringShort("Text Overlay") })
      ],
      { title: "Composition Layers" }
    );

    assert.equal(repeatingGroupElement.type, "repeating-group");
    assert.equal(repeatingGroupElement.title, "Composition Layers");
    assert.equal(repeatingGroupElement.entries.length, 2);
    assert.equal(repeatingGroupElement.entries[0].label, "Layer 1");
  });

  it("should support escape hatches and structured data (Markdown, HTML, XML, and JSON) with BaseModifiers", () =>
  {
    const markdownElement = markdown("### Heading\n- Item 1\n- Item 2", { modifiers: { copyable: true } });
    assert.equal(markdownElement.type, "markdown");
    assert.equal(markdownElement.content, "### Heading\n- Item 1\n- Item 2");
    assert.equal(markdownElement.modifiers?.copyable, true);

    const htmlElement = html("<div class='custom-widget'>Content</div>", { modifiers: { copyable: false } });
    assert.equal(htmlElement.type, "html");
    assert.equal(htmlElement.content, "<div class='custom-widget'>Content</div>");
    assert.equal(htmlElement.modifiers?.copyable, false);

    const xmlElement = xml("<root><item id='1'>Value</item></root>", { modifiers: { copyable: true } });
    assert.equal(xmlElement.type, "xml");
    assert.equal(xmlElement.value, "<root><item id='1'>Value</item></root>");
    assert.equal(xmlElement.modifiers?.copyable, true);

    const jsonElement = json("{\"key\": \"value\", \"count\": 42}", { modifiers: { copyable: true } });
    assert.equal(jsonElement.type, "json");
    assert.equal(jsonElement.value, "{\"key\": \"value\", \"count\": 42}");
    assert.equal(jsonElement.modifiers?.copyable, true);
  });

  it("should validate all type guards correctly", () =>
  {
    const shortElement = stringShort("Test");
    assert.ok(isUiElement(shortElement));
    assert.ok(isStringShortElement(shortElement));
    assert.equal(isTableElement(shortElement), false);

    const xmlElement = xml("<data/>");
    assert.ok(isXmlElement(xmlElement));
    assert.equal(isJsonElement(xmlElement), false);

    const jsonElement = json("{}");
    assert.ok(isJsonElement(jsonElement));
    assert.equal(isXmlElement(jsonElement), false);

    const buttonElement = buttonAction("cmd", "Click Me");
    assert.ok(isActionElement(buttonElement));
    assert.ok(isButtonActionElement(buttonElement));

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

    const buttonClass = new ButtonActionElementClass("export", "Export", { variant: ButtonVariant.primary });
    assert.ok(buttonClass instanceof BaseActionElement);
    assert.ok(buttonClass instanceof ButtonActionElementClass);
    assert.equal(buttonClass.type, "button");
    assert.equal(buttonClass.commandId, "export");
    assert.equal(buttonClass.label, "Export");
    assert.ok(isActionElement(buttonClass));
    assert.ok(isButtonActionElement(buttonClass));

    const json = JSON.stringify(shortClass.toJSON());
    assert.equal(json, "{\"type\":\"string-short\",\"value\":\"Class Value\",\"representation\":\"chip\"}");

    const featureClass = new FeatureClass([ shortClass ], { actions: [ buttonClass ] });
    assert.ok(featureClass instanceof GrammarNode);
    assert.ok(featureClass instanceof FeatureClass);
    assert.equal(featureClass.schemaVersion, "1.0");
    assert.equal(featureClass.elements.length, 1);
    assert.equal(featureClass.actions?.length, 1);

    const blockClass = new FeatureBlockClass("Block Title", [ shortClass ], { description: "Block Subtitle" });
    assert.ok(blockClass instanceof GrammarNode);
    assert.ok(blockClass instanceof FeatureBlockClass);
    assert.equal(blockClass.title, "Block Title");
    assert.equal(blockClass.description, "Block Subtitle");
    assert.equal(blockClass.schemaVersion, "1.0");
    assert.equal(blockClass.elements.length, 1);

    // Verify parameterless instantiation compatibility at runtime (e.g. class-transformer plainToInstance)
    const emptyFeatureClass = new (FeatureClass as new () => FeatureClass)();
    assert.ok(emptyFeatureClass instanceof FeatureClass);
    assert.equal(emptyFeatureClass.schemaVersion, "1.0");
    assert.deepEqual(emptyFeatureClass.elements, []);
    assert.equal(emptyFeatureClass.actions, undefined);

    const emptyBlockClass = new (FeatureBlockClass as new () => FeatureBlockClass)();
    assert.ok(emptyBlockClass instanceof FeatureBlockClass);
    assert.equal(emptyBlockClass.schemaVersion, "1.0");
    assert.deepEqual(emptyBlockClass.elements, []);
    assert.equal(emptyBlockClass.title, undefined);

    const emptyShortClass = new (StringShortElementClass as new () => StringShortElementClass)();
    assert.ok(emptyShortClass instanceof StringShortElementClass);
    assert.equal(emptyShortClass.type, "string-short");
    assert.equal(emptyShortClass.representation, StringShortRepresentation.plain);
  });

  it("should construct Feature container using Feature fluent builder and functional helper", () =>
  {
    const feature = Feature.builder()
      .addLabelValue("Key", stringShort("Value"))
      .addAction(buttonAction("export", "Export"))
      .build();

    assert.ok(feature instanceof FeatureClass);
    assert.ok(feature instanceof GrammarNode);
    assert.equal(feature.schemaVersion, "1.0");
    assert.equal(feature.elements.length, 1);
    assert.equal(feature.elements[0].type, "label-value");
    assert.equal(feature.actions?.length, 1);

    const featureHelper = createFeature({
      elements: [ labelValue("Direct", stringShort("Text")) ]
    });
    assert.ok(featureHelper instanceof FeatureClass);
    assert.ok(featureHelper instanceof GrammarNode);
    assert.equal(featureHelper.schemaVersion, "1.0");
    assert.equal(featureHelper.elements.length, 1);

    // Verify toString() produces compact unindented JSON string representation
    const jsonString = feature.toString();
    assert.equal(jsonString, JSON.stringify(feature.toJSON()));
    assert.ok(!jsonString.includes("\n"));

    const builderJsonString = Feature.builder().addLabelValue("Key", stringShort("Value")).toString();
    assert.equal(builderJsonString, Feature.builder().addLabelValue("Key", stringShort("Value")).build().toString());
    const parsedBuilder = JSON.parse(builderJsonString);
    assert.equal(parsedBuilder.schemaVersion, "1.0");
    assert.equal(parsedBuilder.elements.length, 1);
    assert.equal(parsedBuilder.elements[0].label, "Key");

    // Test Feature.parse() and parseFeature()
    const parsedFeature = Feature.parse(builderJsonString);
    assert.ok(parsedFeature instanceof FeatureClass);
    assert.ok(parsedFeature instanceof GrammarNode);
    assert.equal(parsedFeature.schemaVersion, "1.0");
    assert.equal(parsedFeature.elements.length, 1);
    assert.ok(isFeature(parsedFeature));

    const parsedFeatureObject = parseFeature(parsedBuilder);
    assert.ok(parsedFeatureObject instanceof FeatureClass);
    assert.equal(parsedFeatureObject.elements[0].type, "label-value");

    // Test FeatureBlock.parse() and parseFeatureBlock()
    const block = FeatureBlock.builder("Test Title").addLabelValue("A", stringShort("B")).build();
    const blockJson = block.toString();
    const parsedBlock = FeatureBlock.parse(blockJson);
    assert.ok(parsedBlock instanceof FeatureBlockClass);
    assert.ok(parsedBlock instanceof GrammarNode);
    assert.equal(parsedBlock.title, "Test Title");
    assert.equal(parsedBlock.elements.length, 1);
    assert.ok(isFeatureBlock(parsedBlock));

    const parsedBlockObject = parseFeatureBlock(JSON.parse(blockJson));
    assert.ok(parsedBlockObject instanceof FeatureBlockClass);
    assert.equal(parsedBlockObject.title, "Test Title");

    // Test invalid schema throws Error
    assert.throws(
      () =>
      {
        Feature.parse("{\"invalid\":\"data\"}");
      },
      /Invalid JSON/
    );
  });

});
