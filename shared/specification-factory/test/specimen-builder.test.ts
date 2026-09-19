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
  color,
  createUiCard,
  createUiContainer,
  divider,
  DividerStyle,
  EnvelopClass,
  externalLinkAction,
  flowing,
  html,
  isButtonActionElement,
  isColourElement,
  isEnvelop,
  isFlowingElement,
  isJsonElement,
  isLabelValueElement,
  isMultiSlotElement,
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
  Shape,
  Size,
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
          labelValue("Camera Model", stringShort("Sony Alpha 7 IV", { modifiers: { copyable: true } })),
          labelValue("Shutter Speed", stringShort("1/250s")),
          labelValue("Aperture", stringShort("f/2.8")),
          labelValue("ISO Rating", numberUnbounded(400, { unit: "ISO" })),
          labelValue("Capture Time", timestamp(Date.parse("2026-08-31T14:30:00Z"), { format: TimestampFormat.datetime })),
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

    assert.ok(isMultiSlotElement(multiSlotElement));
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
    assert.ok(container instanceof ViewKitNode);
    assert.equal(container.schemaVersion, "1.0");
    assert.equal(container.elements.length, 1);
    assert.equal(container.elements[0].type, "label-value");

    const containerHelper = createUiContainer({
      elements: [ labelValue("Direct", stringShort("Text")) ]
    });
    assert.ok(containerHelper instanceof UiContainerClass);
    assert.ok(containerHelper instanceof ViewKitNode);
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
    assert.ok(parsedContainer instanceof ViewKitNode);
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

  it("should construct flowing layout element and validate via type guard", () =>
  {
    const card = UiCard.builder("Flowing Tags")
      .addFlowing([
        stringShort("Tag 1"),
        stringShort("Tag 2"),
        stringShort("Tag 3")
      ])
      .build();

    assert.equal(card.elements.length, 1);
    const flowingContainer = card.elements[0];
    assert.ok(isUiElement(flowingContainer));
    assert.ok(isFlowingElement(flowingContainer));

    if (isFlowingElement(flowingContainer))
    {
      assert.equal(flowingContainer.type, "flowing");
      assert.equal(flowingContainer.elements.length, 3);
      assert.equal(flowingContainer.elements[0].type, "string-short");
    }

    const standaloneFlow = flowing([
      stringShort("Alpha"),
      stringShort("Beta")
    ]);
    assert.equal(standaloneFlow.type, "flowing");
    assert.ok(isFlowingElement(standaloneFlow));
  });

  it("should be parseable", () =>
  {
    const json = {
      "elements": [ {
        "type": "table",
        "rows": [ {
          "cells": [ {
            "type": "string-short",
            "value": "Prompt",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "string-long",
            "value": "red substance raising to mid air forming three texts : \"LoRa\", \"ControlNet\", \"Negative Prompting\".\n\nHighly detailed with natural textures and intricate patterns, showcasing realistic lighting and deep shadows to give the scene a sense of depth. The focus should be clearly defined, making every object appear sharply focused with pin-sharp details.",
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "Negative Prompt",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "string-long",
            "value": "Horror,2d ,anime ,drawing",
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "Model",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "string-short",
            "value": "flux1-dev.sft",
            "representation": "plain",
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "Sampler",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "string-short",
            "value": "euler (dpmpp_2m)",
            "representation": "plain",
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "Steps",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "number-unbounded",
            "value": 1.234,
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "CFG Scale",
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
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "Seed",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "identifier",
            "value": "euler",
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "Dimensions",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "string-short",
            "value": "NaN × NaN",
            "representation": "plain",
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "VAE",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "string-short",
            "value": "ae.sft",
            "representation": "plain",
            "modifiers": {
              "copyable": true
            }
          } ]
        }, {
          "cells": [ {
            "type": "string-short",
            "value": "CLIP",
            "representation": "plain",
            "modifiers": {
              "weight": "heavy",
              "intensity": "low"
            }
          }, {
            "type": "string-short",
            "value": "t5xxl_fp16.safetensors, clip_l.safetensors",
            "representation": "plain",
            "modifiers": {
              "copyable": true
            }
          } ]
        } ],
        "hasHeader": true,
        "isStriped": false,
        "withColumnSeparators": false,
        "withRowSeparators": true
      }, {
        "type": "collapsible-group",
        "title": "LoRAs",
        "elements": [ {
          "type": "table",
          "rows": [ {
            "cells": [ {
              "type": "string-short",
              "value": "Flux\\flux_realism_lora.safetensors",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "copyable": true
              }
            }, {
              "type": "string-short",
              "value": "Model: 0.9500000000000001",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          } ],
          "hasHeader": true,
          "isStriped": false,
          "withColumnSeparators": false,
          "withRowSeparators": true
        } ],
        "summary": "1 LoRA",
        "defaultExpanded": false
      }, {
        "type": "collapsible-group",
        "title": "ControlNet & Adapters",
        "elements": [ {
          "type": "table",
          "rows": [ {
            "cells": [ {
              "type": "string-short",
              "value": "Flux\\controlnet.safetensors",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "copyable": true
              }
            }, {
              "type": "string-short",
              "value": "Active",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          } ],
          "hasHeader": true,
          "isStriped": false,
          "withColumnSeparators": false,
          "withRowSeparators": true
        } ],
        "summary": "1 adapter",
        "defaultExpanded": false
      }, {
        "type": "collapsible-group",
        "title": "Upscaling & Refinement",
        "elements": [ {
          "type": "table",
          "rows": [ {
            "cells": [ {
              "type": "string-short",
              "value": "Upscale Model",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "string-short",
              "value": "4xFFHQDAT.pth",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          } ],
          "hasHeader": true,
          "isStriped": false,
          "withColumnSeparators": false,
          "withRowSeparators": true
        } ],
        "summary": "1 property",
        "defaultExpanded": false
      }, {
        "type": "collapsible-group",
        "title": "Input Images",
        "elements": [ {
          "type": "table",
          "rows": [ {
            "cells": [ {
              "type": "string-short",
              "value": "Image 1",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "string-short",
              "value": "example.png",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "Image 2",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "string-short",
              "value": "clipspace/clipspace-mask-9414958.699999988.png [input]",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "Image 3",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "string-short",
              "value": "pasted/image (81).png",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "Image 4",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "string-short",
              "value": "pasted/image (82).png",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          } ],
          "hasHeader": true,
          "isStriped": false,
          "withColumnSeparators": false,
          "withRowSeparators": true
        } ],
        "summary": "4 images",
        "defaultExpanded": false
      }, {
        "type": "collapsible-group",
        "title": "Workflow Topology",
        "elements": [ {
          "type": "table",
          "rows": [ {
            "cells": [ {
              "type": "string-short",
              "value": "Total Nodes",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "number-unbounded",
              "value": 99
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "Active Nodes",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "number-unbounded",
              "value": 64
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "Bypassed Nodes",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "number-unbounded",
              "value": 35
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "Workflow Groups",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "string-short",
              "value": "Model Loading : Unet | CLIP | | LoRA | ControlNet, Official implementation with a little tweak, Negative Prompting version from ComfyUI blog post (My interpretation), img to img or size picking, ControlNet Preprocessing, VisionLLM for detail caption | LLaVa 13B w/ Ollama | Florence2, Outputs, Simple inpaint, Upscale(Hi-resFix) with Tiled Diffusion",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "Custom Packs",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy",
                "intensity": "low"
              }
            }, {
              "type": "string-short",
              "value": "rgthree-comfy, ComfyUI-Impact-Pack",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          } ],
          "hasHeader": true,
          "isStriped": false,
          "withColumnSeparators": false,
          "withRowSeparators": true
        }, {
          "type": "table",
          "rows": [ {
            "cells": [ {
              "type": "string-short",
              "value": "other",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 53
            }, {
              "type": "string-short",
              "value": "VAELoader, VAEEncode, Anything Everywhere?, VAEDecode, Seed (rgthree), PlaySound|pysssss, FluxGuidance, PixelKSampleHookCombine, CfgScheduleHookProvider, StepsScheduleHookProvider, DenoiseScheduleHookProvider, ImpactSwitch, ShowText|pysssss, Anything Everywhere3, RandomNoise //Inspire, BasicScheduler, BasicGuider, String Literal, CannyEdgePreprocessor, Anything Everywhere, DynamicThresholdingFull, Get resolution [Crystools], OllamaVision, Florence2Run, PixelResolutionCalculator",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "image",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 16
            }, {
              "type": "string-short",
              "value": "EmptyImage, PreviewImage, Image Comparer (rgthree), LoadImage, ImageResize+, ImageCrop+, ImageScaleToTotalPixels",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "conditioning",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 11
            }, {
              "type": "string-short",
              "value": "DualCLIPLoader, CLIPTextEncode, InpaintModelConditioning",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "model",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 5
            }, {
              "type": "string-short",
              "value": "Florence2ModelLoader, UNETLoader, ModelSamplingFlux, TiledDiffusion",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "sampling",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 4
            }, {
              "type": "string-short",
              "value": "SamplerCustomAdvanced, KSamplerSelect, KSamplerAdvanced, KSamplerAdvanced //Inspire",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "controlnet",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 3
            }, {
              "type": "string-short",
              "value": "ControlNetApplyAdvanced, ControlNetLoader, ControlNetApply",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "upscaling",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 3
            }, {
              "type": "string-short",
              "value": "IterativeImageUpscale, PixelKSampleUpscalerProvider, UpscaleModelLoader",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "latent",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 3
            }, {
              "type": "string-short",
              "value": "EmptyLatentImage, LatentSizeToPixelSize, SDXLEmptyLatentSizePicker+",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          }, {
            "cells": [ {
              "type": "string-short",
              "value": "lora",
              "representation": "plain",
              "modifiers": {
                "weight": "heavy"
              }
            }, {
              "type": "number-unbounded",
              "value": 1
            }, {
              "type": "string-short",
              "value": "LoraLoaderModelOnly",
              "representation": "plain",
              "modifiers": {
                "copyable": true
              }
            } ]
          } ],
          "hasHeader": true,
          "isStriped": false,
          "withColumnSeparators": false,
          "withRowSeparators": true,
          "columns": [ {
            "header": "Category",
            "width": "25%"
          }, {
            "header": "Count",
            "width": "15%"
          }, {
            "header": "Node Types",
            "width": "60%"
          } ]
        } ],
        "summary": "99 nodes (64 active)",
        "defaultExpanded": false
      } ],
      "schemaVersion": "1.0"
    };
    const uiContainer = UiContainer.parse(json, true);
    assert.equal(uiContainer.elements.length, 6);
  });

});
