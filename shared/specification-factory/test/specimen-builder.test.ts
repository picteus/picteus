import { describe, it } from "node:test";
import { strict as assert } from "node:assert/strict";

import {
  BadgeVariant,
  BaseUiAction,
  BaseUiElement,
  boolean,
  BooleanElementClass,
  BooleanRepresentation,
  buttonAction,
  ButtonActionElementClass,
  ButtonVariant,
  collapsibleGroup,
  color,
  createUiCard,
  createUiContainer,
  dimensions,
  divider,
  DividerStyle,
  EnvelopClass,
  externalLinkAction,
  flowing,
  html,
  isBooleanElement,
  isButtonActionElement,
  isColourElement,
  isDimensionsElement,
  isEnvelop,
  isFlowingElement,
  isJsonElement,
  isLabelValueElement,
  isMultiSlotElement,
  isStringElement,
  isStringsElement,
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
  Separator,
  Shape,
  Size,
  slot,
  string,
  StringElementClass,
  StringRepresentation,
  strings,
  StringsElementClass,
  table,
  tableColumn,
  TableColumnAlign,
  TableColumnWidthMode,
  tableRow,
  TextWeight,
  timestamp,
  TimestampFormat,
  UiCard,
  UiCardClass,
  UiContainer,
  UiContainerClass,
  ViewKitNode,
  xml
} from "../dist/typescript/viewKit.js";


describe("TypeScript Card & Visual DSL Builder", () =>
{

  it("should construct Dominant Colors specimen using fluent builder", () =>
  {
    const card = UiCard.builder("Dominant Colors")
      .description("Palette computed from image pixels")
      .addLabelValue("Dominant Palette", flowing([
        color("#2D3748", { shape: Shape.square, size: Size.small, showText: false }),
        color("#4A5568", { shape: Shape.square, size: Size.small, showText: false }),
        color("#CBD5E0", { shape: Shape.square, size: Size.small, showText: false })
      ]))
      .addLabelValue("Primary Hue", string("Slate", {
        representation: StringRepresentation.chip,
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
    if (isLabelValueElement(firstElement))
    {
      assert.equal(firstElement.label, "Dominant Palette");
      assert.equal(firstElement.value.type, "flowing");
    }
    else
    {
      assert.fail("Expected first element to be LabelValueElement");
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
          labelValue("Camera Model", string("Sony Alpha 7 IV", { modifiers: { copyable: true } })),
          labelValue("Shutter Speed", string("1/250s")),
          labelValue("Aperture", string("f/2.8")),
          labelValue("ISO Rating", numberUnbounded(400, { unit: "ISO" })),
          labelValue("Capture Time", timestamp(Date.parse("2026-08-31T14:30:00Z"), { format: TimestampFormat.datetime })),
          collapsibleGroup(
            "Detailed EXIF",
            [
              labelValue("Focal Length", string("35mm")),
              labelValue("Metering Mode", string("Multi-segment")),
              labelValue("Flash Fired", boolean(false, {
                representation: BooleanRepresentation.badge,
                falseLabel: "No Flash",
                variant: BadgeVariant.neutral
              }))
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
        tableRow([ string("Resolution"), string("3840 x 2160") ]),
        tableRow([ string("Color Space"), string("sRGB") ])
      ],
      {
        columns: [
          tableColumn({ header: "Property", align: TableColumnAlign.left, width: 30, widthMode: TableColumnWidthMode.maximum }),
          tableColumn({ header: "Value", align: TableColumnAlign.right, width: 70 })
        ],
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
    assert.equal(tableElement.columns[0].width, 30);
    assert.equal(tableElement.columns[0].widthMode, TableColumnWidthMode.maximum);
    assert.equal(tableElement.columns[1].width, 70);
    assert.equal(tableElement.columns[1].widthMode, TableColumnWidthMode.fixed);
    assert.equal(tableElement.columns[1].align, TableColumnAlign.right);

    const multiSlotElement = multiSlot(
      [
        slot(string("Slot 1"), { width: 33 }),
        slot(string("Slot 2"), { width: 67 })
      ]
    );

    assert.ok(isMultiSlotElement(multiSlotElement));
    assert.equal(multiSlotElement.type, "multi-slot");
    assert.equal(multiSlotElement.slots.length, 2);
    assert.equal(multiSlotElement.slots[0].width, 33);
    assert.equal(multiSlotElement.slots[1].width, 67);
  });

  it("should build repeating group elements", () =>
  {
    const repeatingGroupElement = repeatingGroup(
      [
        repeatingGroupEntry("Layer 1", { value: string("Background") }),
        repeatingGroupEntry("Layer 2", { value: string("Text Overlay") })
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
    const shortElement = string("Test");
    assert.ok(isUiElement(shortElement));
    assert.ok(isStringElement(shortElement));
    assert.equal(isTableElement(shortElement), false);

    const boolElement = boolean(true);
    assert.ok(isUiElement(boolElement));
    assert.ok(isBooleanElement(boolElement));
    assert.equal(isBooleanElement(shortElement), false);

    const xmlElement = xml("<data/>");
    assert.ok(isXmlElement(xmlElement));
    assert.equal(isJsonElement(xmlElement), false);

    const jsonElement = json("{}");
    assert.ok(isJsonElement(jsonElement));
    assert.equal(isXmlElement(jsonElement), false);

    const colorElement = color("#FF0000", { shape: Shape.circle, size: Size.medium, showText: true });
    assert.ok(isUiElement(colorElement));
    assert.ok(isColourElement(colorElement));
    assert.equal(colorElement.type, "color");
    assert.equal(colorElement.shape, Shape.circle);
    assert.equal(colorElement.size, Size.medium);
    assert.equal(colorElement.showText, true);

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
      .addLabelValue("Key", string("Value"))
      .build();

    const jsonString = JSON.stringify(card);
    const parsed = JSON.parse(jsonString);

    assert.equal(parsed.schemaVersion, "1.0");
    assert.equal(parsed.title, "JSON Test");
    assert.equal(parsed.elements[0].type, "label-value");
    assert.equal(parsed.elements[0].label, "Key");
    assert.equal(parsed.elements[0].value.type, "string");
    assert.equal(parsed.elements[0].value.value, "Value");
  });

  it("should support instantiated classes implementing element interfaces", () =>
  {
    const shortClass = new StringElementClass("Class Value", { representation: StringRepresentation.chip });
    assert.ok(shortClass instanceof BaseUiElement);
    assert.ok(shortClass instanceof StringElementClass);
    assert.equal(shortClass.type, "string");
    assert.equal(shortClass.value, "Class Value");
    assert.equal(shortClass.representation, StringRepresentation.chip);
    assert.ok(isUiElement(shortClass));
    assert.ok(isStringElement(shortClass));

    const boolClass = new BooleanElementClass(true, {
      representation: BooleanRepresentation.badge,
      trueLabel: "Active"
    });
    assert.ok(boolClass instanceof BaseUiElement);
    assert.ok(boolClass instanceof BooleanElementClass);
    assert.equal(boolClass.type, "boolean");
    assert.equal(boolClass.value, true);
    assert.equal(boolClass.representation, BooleanRepresentation.badge);
    assert.equal(boolClass.trueLabel, "Active");
    assert.ok(isUiElement(boolClass));
    assert.ok(isBooleanElement(boolClass));

    const buttonClass = new ButtonActionElementClass("export", "Export", { variant: ButtonVariant.primary });
    assert.ok(buttonClass instanceof BaseUiAction);
    assert.ok(buttonClass instanceof ButtonActionElementClass);
    assert.equal(buttonClass.type, "button");
    assert.equal(buttonClass.commandId, "export");
    assert.equal(buttonClass.label, "Export");
    assert.ok(isUiAction(buttonClass));
    assert.ok(isButtonActionElement(buttonClass));

    const jsonString = JSON.stringify(shortClass.toJSON());
    assert.equal(jsonString, "{\"type\":\"string\",\"value\":\"Class Value\",\"representation\":\"chip\"}");

    const envelopClass = new EnvelopClass();
    assert.ok(envelopClass instanceof ViewKitNode);
    assert.ok(envelopClass instanceof EnvelopClass);
    assert.equal(envelopClass.schemaVersion, "1.0");
    assert.ok(isEnvelop(envelopClass));
    assert.ok(isEnvelop({ schemaVersion: "1.0" }));

    const containerClass = new UiContainerClass([ shortClass ]);
    assert.ok(containerClass instanceof ViewKitNode);
    assert.ok(containerClass instanceof UiContainerClass);
    assert.equal(containerClass.schemaVersion, "1.0");
    assert.equal(containerClass.elements.length, 1);
    assert.ok(isEnvelop(containerClass));

    const cardClass = new UiCardClass("Card Title", [ shortClass ], {
      description: "Card Subtitle",
      actions: [ buttonClass ]
    });
    assert.ok(cardClass instanceof ViewKitNode);
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

    const emptyShortClass = new (StringElementClass as new () => StringElementClass)();
    assert.ok(emptyShortClass instanceof StringElementClass);
    assert.equal(emptyShortClass.type, "string");
    assert.equal(emptyShortClass.representation, StringRepresentation.plain);
  });

  it("should construct UiContainer using UiContainer fluent builder and functional helper", () =>
  {
    const container = UiContainer.builder()
      .addLabelValue("Key", string("Value"))
      .build();

    assert.ok(container instanceof UiContainerClass);
    assert.ok(container instanceof ViewKitNode);
    assert.equal(container.schemaVersion, "1.0");
    assert.equal(container.elements.length, 1);
    assert.equal(container.elements[0].type, "label-value");

    const containerHelper = createUiContainer({
      elements: [ labelValue("Direct", string("Text")) ]
    });
    assert.ok(containerHelper instanceof UiContainerClass);
    assert.ok(containerHelper instanceof ViewKitNode);
    assert.equal(containerHelper.schemaVersion, "1.0");
    assert.equal(containerHelper.elements.length, 1);

    // Verify toString() produces compact unindented JSON string representation
    const jsonString = container.toString();
    assert.equal(jsonString, JSON.stringify(container.toJSON()));
    assert.ok(!jsonString.includes("\n"));

    const builderJsonString = UiContainer.builder().addLabelValue("Key", string("Value")).toString();
    assert.equal(builderJsonString, UiContainer.builder().addLabelValue("Key", string("Value")).build().toString());
    const parsedBuilder = JSON.parse(builderJsonString);
    assert.equal(parsedBuilder.schemaVersion, "1.0");
    assert.equal(parsedBuilder.elements.length, 1);
    assert.equal(parsedBuilder.elements[0].label, "Key");

    // Test UiContainer.parse() and parseUiContainer()
    const parsedContainer = UiContainer.parse(builderJsonString);
    assert.ok(parsedContainer instanceof UiContainerClass);
    assert.ok(parsedContainer instanceof ViewKitNode);
    assert.equal(parsedContainer.schemaVersion, "1.0");
    assert.equal(parsedContainer.elements.length, 1);
    assert.ok(isUiContainer(parsedContainer));

    const parsedContainerObject = parseUiContainer(parsedBuilder);
    assert.ok(parsedContainerObject instanceof UiContainerClass);
    assert.equal(parsedContainerObject.elements[0].type, "label-value");

    // Test UiCard.parse() and parseUiCard()
    const card = UiCard.builder("Test Title").addLabelValue("A", string("B")).build();
    const cardJson = card.toString();
    const parsedCard = UiCard.parse(cardJson);
    assert.ok(parsedCard instanceof UiCardClass);
    assert.ok(parsedCard instanceof ViewKitNode);
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
                { type: "string", value: "Valid cell" },
                { type: "string" }
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

  it("should construct flowing layout element and validate via type guard", () =>
  {
    const card = UiCard.builder("Flowing Tags")
      .addFlowing([
        string("Tag 1"),
        string("Tag 2"),
        string("Tag 3")
      ], { separator: Separator.bar })
      .build();

    assert.equal(card.elements.length, 1);
    const flowingContainer = card.elements[0];
    assert.ok(isUiElement(flowingContainer));
    assert.ok(isFlowingElement(flowingContainer));

    if (isFlowingElement(flowingContainer))
    {
      assert.equal(flowingContainer.type, "flowing");
      assert.equal(flowingContainer.separator, Separator.bar);
      assert.equal(flowingContainer.elements.length, 3);
      assert.equal(flowingContainer.elements[0].type, "string");
    }

    const standaloneFlow = flowing([
      string("Alpha"),
      string("Beta")
    ], { separator: Separator.comma });
    assert.equal(standaloneFlow.type, "flowing");
    assert.equal(standaloneFlow.separator, Separator.comma);
    assert.ok(isFlowingElement(standaloneFlow));

    const spacedFlow = flowing([
      string("One"),
      string("Two")
    ], { separator: Separator.space });
    assert.equal(spacedFlow.separator, Separator.space);
  });

  it("should construct strings element and validate via type guard", () =>
  {
    const tagsElement = strings([ "portrait", "cinematic", "8k" ], {
      representation: StringRepresentation.chip,
      separator: Separator.dot,
      modifiers: { copyable: true }
    });
    assert.ok(isUiElement(tagsElement));
    assert.ok(isStringsElement(tagsElement));
    assert.equal(tagsElement.type, "strings");
    assert.deepEqual(tagsElement.values, [ "portrait", "cinematic", "8k" ]);
    assert.equal(tagsElement.representation, StringRepresentation.chip);
    assert.equal(tagsElement.separator, Separator.dot);
    assert.equal(tagsElement.modifiers?.copyable, true);

    const card = UiCard.builder("Tag Cloud")
      .addStrings([ "anime", "masterpiece" ], {
        representation: StringRepresentation.plain,
        separator: Separator.comma
      })
      .build();
    assert.equal(card.elements.length, 1);
    const stringsInCard = card.elements[0];
    assert.ok(isStringsElement(stringsInCard));

    const stringsClass = new StringsElementClass([ "alpha", "beta" ], { separator: Separator.space });
    assert.ok(stringsClass instanceof StringsElementClass);
    assert.equal(stringsClass.type, "strings");
    assert.equal(stringsClass.separator, Separator.space);
    assert.deepEqual(stringsClass.values, [ "alpha", "beta" ]);
  });

  it("should construct dimensions element and validate via type guard", () =>
  {
    const dims = dimensions(3840, 2160, { modifiers: { copyable: true } });
    assert.ok(isUiElement(dims));
    assert.ok(isDimensionsElement(dims));
    assert.equal(dims.type, "dimensions");
    assert.equal(dims.width, 3840);
    assert.equal(dims.height, 2160);
    assert.equal(dims.modifiers?.copyable, true);

    const card = UiCard.builder("Image Dimensions")
      .addDimensions(1920, 1080)
      .build();
    assert.equal(card.elements.length, 1);
    const element = card.elements[0];
    assert.ok(isDimensionsElement(element));
    assert.equal(element.width, 1920);
    assert.equal(element.height, 1080);
  });

  it("should be parseable", () =>
  {
    const json = {
      "elements": [
        {
          "type": "table",
          "rows": [
            {
              "cells": [
                {
                  "type": "string",
                  "value": "Prompt",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "string",
                  "value": "(masterpiece,best quality, ultra realistic,32k,RAW photo,detail skin, 8k uhd, dslr,high quality, film grain:1.5),\n short hair , __*/haircolor__ hair,lady,  brown eyes, __*/colors__ __*/Wearcolors__ gradient background, simple background:1.3)",
                  "representation": "plain",
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "Model",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "identifier",
                  "value": "Stable-diffusion\\XL\\Kitchen_Sink_Refiner_00001_.safetensors",
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "Sampler",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "string",
                  "value": "ddim (ddim_uniform)",
                  "representation": "plain",
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "Steps",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "number-unbounded",
                  "value": 20,
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "CFG Scale",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "number-unbounded",
                  "value": 7,
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "Seed",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "identifier",
                  "value": "1009485416280513",
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "Dimensions",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "flowing",
                  "elements": [
                    {
                      "type": "dimensions",
                      "width": 1536,
                      "height": 768,
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "ratio",
                      "value": 2
                    }
                  ]
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "Denoise",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "number-unbounded",
                  "value": 0.25,
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }, {
              "cells": [
                {
                  "type": "string",
                  "value": "VAE",
                  "representation": "plain",
                  "modifiers": {
                    "weight": "heavy",
                    "intensity": "low"
                  }
                }, {
                  "type": "identifier",
                  "value": "VAE\\sdxl_vae.safetensors",
                  "modifiers": {
                    "copyable": true
                  }
                }
              ]
            }
          ],
          "isStriped": false,
          "withColumnSeparators": false,
          "withRowSeparators": true,
          "columns": [
            {
              "align": "left",
              "width": 25,
              "widthMode": "maximum"
            }, {
              "align": "left",
              "widthMode": "fixed"
            }
          ]
        }, {
          "type": "collapsible-group",
          "title": "LoRAs",
          "elements": [
            {
              "type": "table",
              "rows": [
                {
                  "cells": [
                    {
                      "type": "identifier",
                      "value": "Lora\\XL\\add-detail-xl.safetensors",
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 0.99,
                      "modifiers": {
                        "copyable": true
                      }
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "identifier",
                      "value": "Lora\\XL\\JuggerCineXL2.safetensors",
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "identifier",
                      "value": "Lora\\XL\\Kitchen_Sink_Lora.safetensors",
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "identifier",
                      "value": "Lora\\XL\\SDXLHighDetail_v5-000004.safetensors",
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "identifier",
                      "value": "On",
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": null,
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "identifier",
                      "value": "Off",
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": null,
                      "modifiers": {
                        "copyable": true
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 1,
                      "modifiers": {
                        "copyable": true
                      }
                    }
                  ]
                }
              ],
              "isStriped": false,
              "withColumnSeparators": false,
              "withRowSeparators": true,
              "columns": [
                {
                  "header": "Name",
                  "align": "left",
                  "width": 50,
                  "widthMode": "fixed"
                }, {
                  "header": "Model Strength",
                  "align": "left",
                  "width": 25,
                  "widthMode": "fixed"
                }, {
                  "header": "CLIP Strength",
                  "align": "left",
                  "width": 25,
                  "widthMode": "fixed"
                }
              ]
            }
          ],
          "summary": "6 LoRAs",
          "defaultExpanded": false
        }, {
          "type": "collapsible-group",
          "title": "Upscaling & Refinement",
          "elements": [
            {
              "type": "table",
              "rows": [
                {
                  "cells": [
                    {
                      "type": "string",
                      "value": "Upscale Model",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "identifier",
                      "value": "ESRGAN\\4x_face_focus_275k.pth",
                      "modifiers": {
                        "copyable": true
                      }
                    }
                  ]
                }
              ],
              "isStriped": false,
              "withColumnSeparators": false,
              "withRowSeparators": true,
              "columns": [
                {
                  "align": "left",
                  "width": 25,
                  "widthMode": "maximum"
                }, {
                  "align": "left",
                  "widthMode": "fixed"
                }
              ]
            }
          ],
          "summary": "1 property",
          "defaultExpanded": false
        }, {
          "type": "collapsible-group",
          "title": "Workflow Topology",
          "elements": [
            {
              "type": "table",
              "rows": [
                {
                  "cells": [
                    {
                      "type": "string",
                      "value": "Total Nodes",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 110
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "Active Nodes",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 98
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "Bypassed Nodes",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 12
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "Workflow Groups",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "strings",
                      "values": [ "Group" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "Custom Packs",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "strings",
                      "values": [ "ComfyUI-Impact-Pack", "Comfyroll Studio" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }
              ],
              "isStriped": false,
              "withColumnSeparators": false,
              "withRowSeparators": true,
              "columns": [
                {
                  "align": "left",
                  "width": 25,
                  "widthMode": "maximum"
                }, {
                  "align": "left",
                  "widthMode": "fixed"
                }
              ]
            }, {
              "type": "table",
              "rows": [
                {
                  "cells": [
                    {
                      "type": "string",
                      "value": "other",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 34
                    }, {
                      "type": "strings",
                      "values": [
                        "Text Multiline", "VAEDecodeTiled", "StringFunction|pysssss", "SAMLoader", "DPRandomGenerator",
                        "VAEDecode", "UltralyticsDetectorProvider", "ImpactWildcardProcessor", "VAEEncode", "ToBasicPipe",
                        "VAEEncodeForInpaint", "PreviewBridge", "VAELoader", "DPFeelingLucky"
                      ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "image",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 15
                    }, {
                      "type": "strings",
                      "values": [ "ImageScaleBy", "PreviewImage", "SaveImage", "ImageBlend" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "conditioning",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 14
                    }, {
                      "type": "strings",
                      "values": [
                        "CLIPTextEncode", "DPMagicPrompt", "OneButtonPrompt", "SDXLPromptStylerbyArtist",
                        "SDXLPromptStylerHorror", "SDXLPromptStylerMisc", "SDXLPromptStylerbyFantasySetting",
                        "SDXLPromptStylerbyMythicalCreature"
                      ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "utils",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 11
                    }, {
                      "type": "strings",
                      "values": [ "Reroute", "Note", "PrimitiveNode" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "face",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 10
                    }, {
                      "type": "strings",
                      "values": [
                        "BasicPipeToDetailerPipe", "FromDetailerPipe", "FaceDetailerPipe", "ToDetailerPipe", "FaceDetailer"
                      ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "sampling",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 6
                    }, {
                      "type": "strings",
                      "values": [ "KSampler", "KSamplerAdvanced", "KSampler Adv. (Efficient)" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "latent",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 6
                    }, {
                      "type": "strings",
                      "values": [ "EmptyLatentImage" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "upscaling",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 4
                    }, {
                      "type": "strings",
                      "values": [ "ImageUpscaleWithModel", "UpscaleModelLoader" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "lora",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 4
                    }, {
                      "type": "strings",
                      "values": [ "CR Load LoRA" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "mask",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 3
                    }, {
                      "type": "strings",
                      "values": [ "MaskToImage" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }, {
                  "cells": [
                    {
                      "type": "string",
                      "value": "model",
                      "representation": "plain",
                      "modifiers": {
                        "weight": "heavy",
                        "intensity": "low"
                      }
                    }, {
                      "type": "number-unbounded",
                      "value": 3
                    }, {
                      "type": "strings",
                      "values": [ "CheckpointLoaderSimple" ],
                      "representation": "plain",
                      "separator": "dot"
                    }
                  ]
                }
              ],
              "isStriped": false,
              "withColumnSeparators": false,
              "withRowSeparators": true,
              "columns": [
                {
                  "header": "Category",
                  "width": 25
                }, {
                  "header": "Count",
                  "width": 15
                }, {
                  "header": "Node Types",
                  "width": 60
                }
              ]
            }
          ],
          "summary": "110 nodes (98 active)",
          "defaultExpanded": false
        }
      ],
      "schemaVersion": "1.0"
    };
    const uiContainer = UiContainer.parse(json, true);
    assert.equal(uiContainer.elements.length, 6);
  });

});
