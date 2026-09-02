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
    Emphasis,
    StringShortRepresentation,
    BadgeVariant,
    TimestampFormat,
    ButtonVariant,
    TableColumnAlign,
    DividerStyle,
    create_feature,
    create_feature_block,
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
                string_short("Slate", representation=StringShortRepresentation.chip, modifiers=PrimitiveModifiers(emphasis=Emphasis.strong))
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

        first_el = payload["elements"][0]
        self.assertEqual(first_el["type"], "label-value")
        self.assertEqual(first_el["label"], "Dominant Palette")
        self.assertEqual(first_el["value"]["type"], "color-set")
        self.assertEqual(first_el["value"]["colors"], ["#2D3748", "#4A5568", "#CBD5E0"])

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
        tbl = table(
            rows=[
                table_row(["Resolution", string_short("3840 x 2160")]),
                table_row(["Color Space", string_short("sRGB")]),
            ],
            columns=[
                table_column(header="Property", align=TableColumnAlign.left),
                table_column(header="Value", align=TableColumnAlign.right),
            ],
            has_header=True,
            max_columns=2,
        )

        tbl_dict = tbl.to_dict()
        self.assertEqual(tbl_dict["type"], "table")
        self.assertEqual(len(tbl_dict["rows"]), 2)
        self.assertEqual(len(tbl_dict["columns"]), 2)
        self.assertEqual(tbl_dict["columns"][1]["align"], "right")

        ms = multi_slot(
            slots=[
                slot(content=string_short("Slot 1"), width="1/3"),
                slot(content=string_short("Slot 2"), width="2/3"),
            ],
            proportions="1/3 + 2/3",
        )

        ms_dict = ms.to_dict()
        self.assertEqual(ms_dict["type"], "multi-slot")
        self.assertEqual(ms_dict["proportions"], "1/3 + 2/3")
        self.assertEqual(len(ms_dict["slots"]), 2)

    def test_repeating_groups(self):
        rep = repeating_group(
            entries=[
                repeating_group_entry(label="Layer 1", value=string_short("Background")),
                repeating_group_entry(label="Layer 2", value=string_short("Text Overlay")),
            ],
            title="Composition Layers",
        )

        rep_dict = rep.to_dict()
        self.assertEqual(rep_dict["type"], "repeating-group")
        self.assertEqual(rep_dict["title"], "Composition Layers")
        self.assertEqual(len(rep_dict["entries"]), 2)

    def test_escape_hatches(self):
        md = markdown("### Heading\n- Item 1", modifiers=BaseModifiers(copyable=True))
        self.assertEqual(md.to_dict(), {"type": "markdown", "content": "### Heading\n- Item 1", "modifiers": {"copyable": True}})

        ht = html("<div class='widget'>Custom</div>", modifiers=BaseModifiers(copyable=False))
        self.assertEqual(ht.to_dict(), {"type": "html", "content": "<div class='widget'>Custom</div>", "modifiers": {"copyable": False}})

        xml_elem = grammar_xml("<root><val>123</val></root>", modifiers=BaseModifiers(copyable=True))
        self.assertEqual(xml_elem.to_dict(), {"type": "xml", "value": "<root><val>123</val></root>", "modifiers": {"copyable": True}})

        json_elem = grammar_json("{\"success\": true}", modifiers=BaseModifiers(copyable=True))
        self.assertEqual(json_elem.to_dict(), {"type": "json", "value": "{\"success\": true}", "modifiers": {"copyable": True}})

    def test_json_serialization(self):
        block = (
            FeatureBlockBuilder(title="JSON Test")
            .add_label_value("Key", string_short("Value"))
            .build()
        )

        raw_json = block.to_json(indent=2)
        parsed = json.loads(raw_json)

        self.assertEqual(parsed["schemaVersion"], "1.0")
        self.assertEqual(parsed["title"], "JSON Test")
        self.assertEqual(parsed["elements"][0]["type"], "label-value")
        self.assertEqual(parsed["elements"][0]["value"]["value"], "Value")

    def test_protocols_and_inheritance(self):
        elem = string_short("Hello", representation=StringShortRepresentation.chip)
        self.assertTrue(isinstance(elem, UiElementBase))
        self.assertTrue(isinstance(elem, UiElementProtocol))
        self.assertTrue(isinstance(elem, StringShortElementProtocol))
        self.assertEqual(elem.type, "string-short")
        self.assertEqual(elem.value, "Hello")

        btn = button_action(command_id="cmd", label="Action", variant=ButtonVariant.primary)
        self.assertTrue(isinstance(btn, ActionElementBase))
        self.assertTrue(isinstance(btn, ActionElementProtocol))
        self.assertEqual(btn.type, "button")
        self.assertEqual(btn.command_id, "cmd")

    def test_feature_builder(self):
        feat = (
            FeatureBuilder()
            .add_label_value("Key", string_short("Value"))
            .add_action(button_action(command_id="cmd", label="Action"))
            .build()
        )
        self.assertTrue(isinstance(feat, Feature))
        self.assertEqual(feat.schema_version, "1.0")
        self.assertEqual(len(feat.elements), 1)
        self.assertEqual(len(feat.actions), 1)

        feat_helper = create_feature(elements=[label_value(label="Direct", value=string_short("Text"))])
        self.assertEqual(feat_helper.schema_version, "1.0")
        self.assertEqual(len(feat_helper.elements), 1)


if __name__ == "__main__":
    unittest.main()
