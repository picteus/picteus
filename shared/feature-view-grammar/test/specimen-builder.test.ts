import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BadgeVariant,
  BaseUiAction,
  BaseUiElement,
  booleanBadge,
  buttonAction,
  ButtonActionElementClass,
  ButtonVariant,
  collapsibleGroup,
  createUiCard,
  createUiContainer,
  divider,
  DividerStyle,
  dominantColors,
  EnvelopClass,
  externalLinkAction,
  GrammarNode,
  html,
  isButtonActionElement,
  isEnvelop,
  isJsonElement,
  isLabelValueRowElement,
  isStringShortElement,
  isTableElement,
  isUiAction,
  isUiCard,
  isUiContainer,
  isUiElement,
  isXmlElement,
  json,
  labelValue,
  markdown,
  multiSlot,
  numberMeter,
  numberUnbounded,
  parseUiCard,
  parseUiContainer,
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
  UiCard,
  UiCardClass,
  UiContainer,
  UiContainerClass,
  xml
} from "../dist/typescript/featureViewGrammar.js";


describe("TypeScript Card & Visual DSL Builder", () =>
{

  it("should construct Dominant Colors specimen using fluent builder", () =>
  {
    const card = UiCard.builder("Dominant Colors")
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

    assert.equal(card.schemaVersion, "1.0");
    assert.equal(card.title, "Dominant Colors");
    assert.equal(card.description, "Palette computed from image pixels");
    assert.equal(card.elements.length, 4);

    const firstElement = card.elements[0];
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

    assert.ok(card.actions && card.actions.length === 1);
    const action = card.actions[0];
    assert.ok(isUiAction(action));
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
    const card = createUiCard(
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

    assert.equal(card.elements.length, 7);
    assert.equal(card.elements[0].type, "label-value");
    assert.equal(card.elements[5].type, "collapsible-group");
    assert.equal(card.elements[6].type, "divider");
    assert.equal(card.actions?.length, 2);
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
    assert.ok(isUiAction(buttonElement));
    assert.ok(isButtonActionElement(buttonElement));

    assert.equal(isUiElement(null), false);
    assert.equal(isUiElement("not an object"), false);
    assert.equal(isUiAction({ notAnAction: true }), false);
  });

  it("should serialize cleanly to JSON string matching schema shape", () =>
  {
    const card = UiCard.builder("JSON Test")
      .addLabelValue("Key", stringShort("Value"))
      .build();

    const jsonString = JSON.stringify(card);
    const parsed = JSON.parse(jsonString);

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
    assert.ok(buttonClass instanceof BaseUiAction);
    assert.ok(buttonClass instanceof ButtonActionElementClass);
    assert.equal(buttonClass.type, "button");
    assert.equal(buttonClass.commandId, "export");
    assert.equal(buttonClass.label, "Export");
    assert.ok(isUiAction(buttonClass));
    assert.ok(isButtonActionElement(buttonClass));

    const jsonString = JSON.stringify(shortClass.toJSON());
    assert.equal(jsonString, "{\"type\":\"string-short\",\"value\":\"Class Value\",\"representation\":\"chip\"}");

    const envelopClass = new EnvelopClass();
    assert.ok(envelopClass instanceof GrammarNode);
    assert.ok(envelopClass instanceof EnvelopClass);
    assert.equal(envelopClass.schemaVersion, "1.0");
    assert.ok(isEnvelop(envelopClass));
    assert.ok(isEnvelop({ schemaVersion: "1.0" }));

    const containerClass = new UiContainerClass([ shortClass ]);
    assert.ok(containerClass instanceof GrammarNode);
    assert.ok(containerClass instanceof UiContainerClass);
    assert.equal(containerClass.schemaVersion, "1.0");
    assert.equal(containerClass.elements.length, 1);
    assert.ok(isEnvelop(containerClass));

    const cardClass = new UiCardClass("Card Title", [ shortClass ], { description: "Card Subtitle", actions: [ buttonClass ] });
    assert.ok(cardClass instanceof GrammarNode);
    assert.ok(cardClass instanceof UiCardClass);
    assert.equal(cardClass.title, "Card Title");
    assert.equal(cardClass.description, "Card Subtitle");
    assert.equal(cardClass.schemaVersion, "1.0");
    assert.equal(cardClass.elements.length, 1);
    assert.equal(cardClass.actions?.length, 1);

    // Verify parameterless instantiation compatibility at runtime (e.g. class-transformer plainToInstance)
    const emptyContainerClass = new (UiContainerClass as new () => UiContainerClass)();
    assert.ok(emptyContainerClass instanceof UiContainerClass);
    assert.equal(emptyContainerClass.schemaVersion, "1.0");
    assert.deepEqual(emptyContainerClass.elements, []);

    const emptyCardClass = new (UiCardClass as new () => UiCardClass)();
    assert.ok(emptyCardClass instanceof UiCardClass);
    assert.equal(emptyCardClass.schemaVersion, "1.0");
    assert.deepEqual(emptyCardClass.elements, []);
    assert.equal(emptyCardClass.title, undefined);
    assert.equal(emptyCardClass.actions, undefined);

    const emptyShortClass = new (StringShortElementClass as new () => StringShortElementClass)();
    assert.ok(emptyShortClass instanceof StringShortElementClass);
    assert.equal(emptyShortClass.type, "string-short");
    assert.equal(emptyShortClass.representation, StringShortRepresentation.plain);
  });

  it("should construct UiContainer using UiContainer fluent builder and functional helper", () =>
  {
    const container = UiContainer.builder()
      .addLabelValue("Key", stringShort("Value"))
      .build();

    assert.ok(container instanceof UiContainerClass);
    assert.ok(container instanceof GrammarNode);
    assert.equal(container.schemaVersion, "1.0");
    assert.equal(container.elements.length, 1);
    assert.equal(container.elements[0].type, "label-value");

    const containerHelper = createUiContainer({
      elements: [ labelValue("Direct", stringShort("Text")) ]
    });
    assert.ok(containerHelper instanceof UiContainerClass);
    assert.ok(containerHelper instanceof GrammarNode);
    assert.equal(containerHelper.schemaVersion, "1.0");
    assert.equal(containerHelper.elements.length, 1);

    // Verify toString() produces compact unindented JSON string representation
    const jsonString = container.toString();
    assert.equal(jsonString, JSON.stringify(container.toJSON()));
    assert.ok(!jsonString.includes("\n"));

    const builderJsonString = UiContainer.builder().addLabelValue("Key", stringShort("Value")).toString();
    assert.equal(builderJsonString, UiContainer.builder().addLabelValue("Key", stringShort("Value")).build().toString());
    const parsedBuilder = JSON.parse(builderJsonString);
    assert.equal(parsedBuilder.schemaVersion, "1.0");
    assert.equal(parsedBuilder.elements.length, 1);
    assert.equal(parsedBuilder.elements[0].label, "Key");

    // Test UiContainer.parse() and parseUiContainer()
    const parsedContainer = UiContainer.parse(builderJsonString);
    assert.ok(parsedContainer instanceof UiContainerClass);
    assert.ok(parsedContainer instanceof GrammarNode);
    assert.equal(parsedContainer.schemaVersion, "1.0");
    assert.equal(parsedContainer.elements.length, 1);
    assert.ok(isUiContainer(parsedContainer));

    const parsedContainerObject = parseUiContainer(parsedBuilder);
    assert.ok(parsedContainerObject instanceof UiContainerClass);
    assert.equal(parsedContainerObject.elements[0].type, "label-value");

    // Test UiCard.parse() and parseUiCard()
    const card = UiCard.builder("Test Title").addLabelValue("A", stringShort("B")).build();
    const cardJson = card.toString();
    const parsedCard = UiCard.parse(cardJson);
    assert.ok(parsedCard instanceof UiCardClass);
    assert.ok(parsedCard instanceof GrammarNode);
    assert.equal(parsedCard.title, "Test Title");
    assert.equal(parsedCard.elements.length, 1);
    assert.ok(isUiCard(parsedCard));

    const parsedCardObject = parseUiCard(JSON.parse(cardJson));
    assert.ok(parsedCardObject instanceof UiCardClass);
    assert.equal(parsedCardObject.title, "Test Title");

    // Test invalid schema throws Error
    assert.throws(
      () =>
      {
        UiContainer.parse("{\"invalid\":\"data\"}");
      },
      /Invalid JSON/
    );
  });

  it("should perform deep recursive validation and catch invalid nested properties", () =>
  {
    const invalidTablePayload = {
      schemaVersion: "1.0",
      elements: [
        {
          type: "table",
          rows: [
            {
              cells: [
                { type: "string-short", value: "Valid cell" },
                { type: "string-short" }
              ]
            }
          ]
        }
      ]
    };

    // Shallow validation succeeds because top-level structure has schemaVersion and elements array
    assert.equal(isUiContainer(invalidTablePayload, false), true);

    // Deep validation detects the invalid nested cell and fails
    assert.equal(isUiContainer(invalidTablePayload, true), false);

    // UiContainer.parse() with default deep validation rejects the invalid payload
    assert.throws(
      () =>
      {
        UiContainer.parse(invalidTablePayload);
      },
      /Invalid JSON: value does not match the `UiContainer` schema/
    );

    // UiContainer.parse() with withDeepValidation = false accepts it
    const parsedShallow = UiContainer.parse(invalidTablePayload, false);
    assert.ok(parsedShallow instanceof UiContainerClass);
  });

});
