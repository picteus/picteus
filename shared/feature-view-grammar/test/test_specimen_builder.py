import json
import os
import sys
import unittest

# Add dist/python to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dist", "python"))

from feature_view_grammar import (
    Feature,
    FeatureBuilder,
    FeatureBlock,
    FeatureBlockBuilder,
    UiElementBase,
    ActionElementBase,
    UiElementProtocol,
    ActionElementProtocol,
    StringShortElementProtocol,
    BaseModifiers,
    PrimitiveModifiers,
    TextWeight,
    TextIntensity,
    StringShortRepresentation,
    BadgeVariant,
    TimestampFormat,
    ButtonVariant,
    TableColumnAlign,
    DividerStyle,
    create_feature,
    create_feature_block,
    parse_feature,
    parse_feature_block,
    label_value,
    string_short,
    number_unbounded,
    number_meter,
    boolean_badge,
    timestamp,
    dominant_colors,
    markdown,
    html,
    multi_slot,
    slot,
    table,
    table_column,
    table_row,
    repeating_group,
    repeating_group_entry,
    collapsible_group,
    divider,
    button_action,
    external_link_action,
    json as grammar_json,
    xml as grammar_xml,
)


class TestSpecimenBuilder(unittest.TestCase):

    def test_fluent_builder_dominant_colors(self):
        block = (
            FeatureBlockBuilder(title="Dominant Colors")
            .description("Palette computed from image pixels")
            .add_label_value("Dominant Palette", dominant_colors(["#2D3748", "#4A5568", "#CBD5E0"]))
            .add_label_value(
                "Primary Hue",
                string_short("Slate", representation=StringShortRepresentation.chip, modifiers=PrimitiveModifiers(weight=TextWeight.heavy))
            )
            .add_label_value("Confidence", number_meter(92, minimum=0, maximum=100, unit="%"))
            .add_divider(style=DividerStyle.hairline)
            .add_action(button_action(command_id="exportSwatches", label="Export Palette", variant=ButtonVariant.primary, parameters={"format": "ase"}))
            .build()
        )

        self.assertEqual(block.schema_version, "1.0")
        self.assertEqual(block.title, "Dominant Colors")
        self.assertEqual(block.description, "Palette computed from image pixels")
        self.assertEqual(len(block.elements), 4)

        # Test dictionary serialization
        payload = block.to_dict()
        self.assertEqual(payload["schemaVersion"], "1.0")
        self.assertEqual(payload["title"], "Dominant Colors")
        self.assertEqual(len(payload["elements"]), 4)

        first_element = payload["elements"][0]
        self.assertEqual(first_element["type"], "label-value")
        self.assertEqual(first_element["label"], "Dominant Palette")
        self.assertEqual(first_element["value"]["type"], "color-set")
        self.assertEqual(first_element["value"]["colors"], ["#2D3748", "#4A5568", "#CBD5E0"])

        self.assertEqual(len(payload["actions"]), 1)
        action = payload["actions"][0]
        self.assertEqual(action["type"], "button")
        self.assertEqual(action["commandId"], "exportSwatches")
        self.assertEqual(action["variant"], "primary")
        self.assertEqual(action["parameters"], {"format": "ase"})

    def test_functional_dsl_metadata(self):
        block = create_feature_block(
            title="Image Metadata",
            description="EXIF and camera properties",
            elements=[
                label_value("Camera Model", string_short("Sony Alpha 7 IV", modifiers=PrimitiveModifiers(copyable=True))),
                label_value("Shutter Speed", string_short("1/250s")),
                label_value("Aperture", string_short("f/2.8")),
                label_value("ISO Rating", number_unbounded(400, unit="ISO")),
                label_value("Capture Time", timestamp("2026-08-31T14:30:00Z", format=TimestampFormat.full)),
                collapsible_group(
                    title="Detailed EXIF",
                    elements=[
                        label_value("Focal Length", string_short("35mm")),
                        label_value("Metering Mode", string_short("Multi-segment")),
                        label_value("Flash Fired", boolean_badge(False, false_label="No Flash", variant=BadgeVariant.neutral)),
                    ],
                    summary="3 extra fields",
                    default_expanded=False,
                ),
                divider(style=DividerStyle.dashed),
            ],
            actions=[
                button_action(command_id="copyJson", label="Copy Raw JSON", variant=ButtonVariant.secondary),
                external_link_action(url="https://example.com/exif", label="EXIF Specification"),
            ],
        )

        payload = block.to_dict()
        self.assertEqual(len(payload["elements"]), 7)
        self.assertEqual(payload["elements"][0]["type"], "label-value")
        self.assertEqual(payload["elements"][5]["type"], "collapsible-group")
        self.assertEqual(payload["elements"][5]["summary"], "3 extra fields")
        self.assertEqual(len(payload["elements"][5]["elements"]), 3)
        self.assertEqual(payload["elements"][6]["type"], "divider")
        self.assertEqual(payload["elements"][6]["style"], "dashed")
        self.assertEqual(len(payload["actions"]), 2)

    def test_table_and_multislot(self):
        table_element = table(
            rows=[
                table_row([string_short("Resolution"), string_short("3840 x 2160")]),
                table_row([string_short("Color Space"), string_short("sRGB")]),
            ],
            columns=[
                table_column(header="Property", align=TableColumnAlign.left),
                table_column(header="Value", align=TableColumnAlign.right),
            ],
            has_header=True,
            is_striped=True,
            with_column_separators=True,
            with_row_separators=True,
        )

        table_dict = table_element.to_dict()
        self.assertEqual(table_dict["type"], "table")
        self.assertEqual(table_dict["isStriped"], True)
        self.assertEqual(table_dict["withColumnSeparators"], True)
        self.assertEqual(table_dict["withRowSeparators"], True)
        self.assertEqual(len(table_dict["rows"]), 2)
        self.assertEqual(len(table_dict["columns"]), 2)
        self.assertEqual(table_dict["columns"][1]["align"], "right")

        multi_slot_element = multi_slot(
            slots=[
                slot(content=string_short("Slot 1"), width="1/3"),
                slot(content=string_short("Slot 2"), width="2/3"),
            ],
            proportions="1/3 + 2/3",
        )

        multi_slot_dict = multi_slot_element.to_dict()
        self.assertEqual(multi_slot_dict["type"], "multi-slot")
        self.assertEqual(multi_slot_dict["proportions"], "1/3 + 2/3")
        self.assertEqual(len(multi_slot_dict["slots"]), 2)

    def test_repeating_groups(self):
        repeating_group_element = repeating_group(
            entries=[
                repeating_group_entry(label="Layer 1", value=string_short("Background")),
                repeating_group_entry(label="Layer 2", value=string_short("Text Overlay")),
            ],
            title="Composition Layers",
        )

        repeating_group_dict = repeating_group_element.to_dict()
        self.assertEqual(repeating_group_dict["type"], "repeating-group")
        self.assertEqual(repeating_group_dict["title"], "Composition Layers")
        self.assertEqual(len(repeating_group_dict["entries"]), 2)

    def test_escape_hatches(self):
        markdown_element = markdown("### Heading\n- Item 1", modifiers=BaseModifiers(copyable=True))
        self.assertEqual(markdown_element.to_dict(), {"type": "markdown", "content": "### Heading\n- Item 1", "modifiers": {"copyable": True}})

        html_element = html("<div class='widget'>Custom</div>", modifiers=BaseModifiers(copyable=False))
        self.assertEqual(html_element.to_dict(), {"type": "html", "content": "<div class='widget'>Custom</div>", "modifiers": {"copyable": False}})

        xml_element = grammar_xml("<root><val>123</val></root>", modifiers=BaseModifiers(copyable=True))
        self.assertEqual(xml_element.to_dict(), {"type": "xml", "value": "<root><val>123</val></root>", "modifiers": {"copyable": True}})

        json_element = grammar_json("{\"success\": true}", modifiers=BaseModifiers(copyable=True))
        self.assertEqual(json_element.to_dict(), {"type": "json", "value": "{\"success\": true}", "modifiers": {"copyable": True}})

    def test_json_serialization(self):
        block = (
            FeatureBlockBuilder(title="JSON Test")
            .add_label_value("Key", string_short("Value"))
            .build()
        )

        raw_json = block.to_json()
        self.assertNotIn("\n", raw_json)
        parsed = json.loads(raw_json)

        self.assertEqual(parsed["schemaVersion"], "1.0")
        self.assertEqual(parsed["title"], "JSON Test")
        self.assertEqual(parsed["elements"][0]["type"], "label-value")
        self.assertEqual(parsed["elements"][0]["value"]["value"], "Value")

    def test_protocols_and_inheritance(self):
        element = string_short("Hello", representation=StringShortRepresentation.chip)
        self.assertTrue(isinstance(element, UiElementBase))
        self.assertTrue(isinstance(element, UiElementProtocol))
        self.assertTrue(isinstance(element, StringShortElementProtocol))
        self.assertEqual(element.type, "string-short")
        self.assertEqual(element.value, "Hello")

        button_element = button_action(command_id="cmd", label="Action", variant=ButtonVariant.primary)
        self.assertTrue(isinstance(button_element, ActionElementBase))
        self.assertTrue(isinstance(button_element, ActionElementProtocol))
        self.assertEqual(button_element.type, "button")
        self.assertEqual(button_element.command_id, "cmd")

    def test_feature_builder(self):
        feature = (
            FeatureBuilder()
            .add_label_value("Key", string_short("Value"))
            .add_action(button_action(command_id="cmd", label="Action"))
            .build()
        )
        self.assertTrue(isinstance(feature, Feature))
        self.assertEqual(feature.schema_version, "1.0")
        self.assertEqual(len(feature.elements), 1)
        self.assertEqual(len(feature.actions), 1)

        feature_helper = create_feature(elements=[label_value(label="Direct", value=string_short("Text"))])
        self.assertEqual(feature_helper.schema_version, "1.0")
        self.assertEqual(len(feature_helper.elements), 1)

        # Verify to_string(), __str__(), and to_json() produce compact JSON
        json_str = feature.to_string()
        self.assertEqual(json_str, str(feature))
        self.assertNotIn("\n", json_str)
        self.assertEqual(json_str, feature.to_json())

        builder_json_str = str(FeatureBuilder().add_label_value("Key", string_short("Value")))
        self.assertEqual(builder_json_str, FeatureBuilder().add_label_value("Key", string_short("Value")).build().to_string())
        parsed_builder = json.loads(builder_json_str)
        self.assertEqual(parsed_builder["schemaVersion"], "1.0")
        self.assertEqual(len(parsed_builder["elements"]), 1)
        self.assertEqual(parsed_builder["elements"][0]["label"], "Key")

        # Test Feature.parse() and parse_feature()
        parsed_feature = Feature.parse(builder_json_str)
        self.assertTrue(isinstance(parsed_feature, Feature))
        self.assertEqual(parsed_feature.schema_version, "1.0")
        self.assertEqual(len(parsed_feature.elements), 1)
        self.assertEqual(parsed_feature.elements[0].type, "label-value")

        parsed_feature_dict = parse_feature(parsed_builder)
        self.assertTrue(isinstance(parsed_feature_dict, Feature))
        self.assertEqual(parsed_feature_dict.elements[0].label, "Key")

        # Test FeatureBlock.parse() and parse_feature_block()
        block = FeatureBlockBuilder("Test Python Block").add_label_value("A", string_short("B")).build()
        block_json = block.to_string()
        parsed_block = FeatureBlock.parse(block_json)
        self.assertTrue(isinstance(parsed_block, FeatureBlock))
        self.assertEqual(parsed_block.title, "Test Python Block")
        self.assertEqual(len(parsed_block.elements), 1)

        parsed_block_dict = parse_feature_block(json.loads(block_json))
        self.assertTrue(isinstance(parsed_block_dict, FeatureBlock))
        self.assertEqual(parsed_block_dict.title, "Test Python Block")


if __name__ == "__main__":
    unittest.main()
