import { describe, test } from "node:test";
import { strict as assert } from "node:assert/strict";

import { generateIntentPythonCode, generateIntentTypeScriptCode } from "../src/emitter/intents/intentsGenerator.js";
import { IntentSpec } from "../src/emitter/intents/intentsModel.js";


const intentSpec: IntentSpec = {
  enums: [
    {
      name: "Status",
      members: [
        { name: "ready", value: "ready" }
      ]
    }
  ],
  models: [
    {
      name: "Identity",
      properties: [
        { name: "id", optional: false, type: { kind: "string", name: "string" } }
      ]
    },
    {
      name: "BasisIntent",
      isIntent: true,
      properties: [
        { name: "identity", optional: true, type: { kind: "model", name: "Identity" } }
      ]
    },
    {
      name: "FormContent",
      summary: "Form schema and dialog settings.",
      doc: "The schema drives generated inputs and validation; dialog settings only affect modal presentation.",
      properties: [
        {
          name: "parameters",
          summary: "JSON Schema for form fields.",
          doc: "Use an object schema with named properties so submitted values can be returned as a keyed object.",
          optional: false,
          type: { kind: "record", name: "Record" }
        }
      ]
    },
    {
      name: "FormIntent",
      summary: "Collects values for a form.",
      doc: "The client renders the schema and returns the user's submitted values through the intent interaction flow.",
      isIntent: true,
      baseModelName: "BasisIntent",
      audience: "frontEnd",
      properties: [
        { name: "form", optional: false, type: { kind: "model", name: "FormContent" } }
      ]
    },
    {
      name: "Action",
      properties: [
        { name: "intent", optional: false, type: { kind: "model", name: "ProcessCommandIntent" } }
      ]
    },
    {
      name: "ProcessCommandIntent",
      isIntent: true,
      baseModelName: "BasisIntent",
      properties: [
        { name: "processCommand", optional: false, type: { kind: "string", name: "string" } }
      ]
    },
    {
      name: "ActionIntent",
      isIntent: true,
      baseModelName: "BasisIntent",
      audience: "frontEnd",
      properties: [
        { name: "action", optional: false, type: { kind: "model", name: "Action" } }
      ]
    },
    {
      name: "ServeBundle",
      properties: [
        { name: "content", optional: false, type: { kind: "bytes", name: "bytes" } }
      ]
    },
    {
      name: "ServeBundleIntent",
      isIntent: true,
      baseModelName: "BasisIntent",
      audience: "backEnd",
      properties: [
        { name: "serveBundle", optional: false, type: { kind: "model", name: "ServeBundle" } }
      ]
    }
  ],
  unions: [
    {
      name: "Resource",
      variants: [
        { kind: "model", name: "Identity" }
      ]
    }
  ]
};


describe("Intent code generation", () =>
{
  test("generates the complete contract and binary mappings", (): void =>
  {
    const frontEndTypeScriptCode = generateIntentTypeScriptCode(intentSpec, "frontEnd");
    const backEndTypeScriptCode = generateIntentTypeScriptCode(intentSpec, "backEnd");
    const frontEndPythonCode = generateIntentPythonCode(intentSpec, "frontEnd");
    const backEndPythonCode = generateIntentPythonCode(intentSpec, "backEnd");

    assert.match(frontEndTypeScriptCode, /export type FrontIntent = FormIntent \| ActionIntent;/);
    assert.match(frontEndTypeScriptCode, /export function isFormIntent\(intent: unknown\): intent is FormIntent/);
    assert.match(frontEndTypeScriptCode, /hasIntentProperty\(intent, "form"\)/);
    assert.match(frontEndTypeScriptCode, /export function isProcessCommandIntent\(intent: unknown\): intent is ProcessCommandIntent/);
    assert.match(frontEndTypeScriptCode, /hasIntentProperty\(intent, "processCommand"\)/);
    assert.doesNotMatch(frontEndTypeScriptCode, /BackIntent|ServeBundleIntent/);
    assert.match(backEndTypeScriptCode, /export type BackIntent = ServeBundleIntent;/);
    assert.match(backEndTypeScriptCode, /export function isServeBundleIntent\(intent: unknown\): intent is ServeBundleIntent/);
    assert.match(backEndTypeScriptCode, /hasIntentProperty\(intent, "serveBundle"\)/);
    assert.doesNotMatch(backEndTypeScriptCode, /FrontIntent|FormIntent/);
    assert.doesNotMatch(frontEndTypeScriptCode, /isBasisIntent|isWithContextIntent/);
    assert.doesNotMatch(backEndTypeScriptCode, /isBasisIntent|isWithContextIntent/);
    assert.match(backEndTypeScriptCode, /readonly content: Buffer;/);
    assert.match(frontEndTypeScriptCode, /readonly parameters: Record<string, unknown>;/);
    assert.match(frontEndTypeScriptCode, /Collects values for a form\.[\s\S]*@remarks[\s\S]*The client renders the schema/);
    assert.match(frontEndTypeScriptCode, /JSON Schema for form fields\.[\s\S]*@remarks[\s\S]*Use an object schema/);
    assert.match(frontEndPythonCode, /The schema drives generated inputs and validation/);
    assert.match(frontEndPythonCode, /# JSON Schema for form fields\./);
    assert.doesNotMatch(frontEndTypeScriptCode, /\b(IntentJson|Json)\b/);
    assert.doesNotMatch(backEndTypeScriptCode, /\b(IntentJson|Json)\b/);
    assert.match(backEndPythonCode, /BackIntent = Union\[ServeBundleIntent]/);
    assert.doesNotMatch(backEndPythonCode, /FrontIntent|FormIntent/);
    assert.match(backEndPythonCode, /content: bytearray/);
    assert.match(frontEndPythonCode, /FrontIntent = Union\[FormIntent, ActionIntent]/);
    assert.match(frontEndPythonCode, /parameters: Dict\[str, Any]/);
    assert.doesNotMatch(frontEndPythonCode, /\b(IntentJson|Json)\b/);
    assert.doesNotMatch(backEndPythonCode, /\b(IntentJson|Json)\b/);
    assert.doesNotMatch(frontEndTypeScriptCode, /\bBundleIntent\b/);
    assert.doesNotMatch(backEndPythonCode, /\bBundleIntent\b/);
  });

  test("generates guards only for the selected audience intent models", (): void =>
  {
    const frontEndTypeScriptCode = generateIntentTypeScriptCode(intentSpec, "frontEnd");
    const backEndTypeScriptCode = generateIntentTypeScriptCode(intentSpec, "backEnd");

    assert.doesNotMatch(frontEndTypeScriptCode, /isServeBundleIntent/);
    assert.doesNotMatch(backEndTypeScriptCode, /isFormIntent/);
  });

  test("keeps shared TypeScript declarations local to its generated back-end file", (): void =>
  {
    const backEndTypeScriptCode = generateIntentTypeScriptCode(intentSpec, "backEnd");

    assert.match(backEndTypeScriptCode, /interface BasisIntent/);
    assert.doesNotMatch(backEndTypeScriptCode, /export interface BasisIntent/);
    assert.match(backEndTypeScriptCode, /export interface ServeBundleIntent/);
  });

  test("generates types with Intent prefix for non-intent declarations and preserves intent model names", (): void =>
  {
    const specWithUnprefixedTypes: IntentSpec = {
      enums: [
        {
          name: "DialogType",
          members: [
            { name: "info", value: "info" }
          ]
        }
      ],
      models: [
        {
          name: "Identity",
          properties: [
            { name: "id", optional: false, type: { kind: "string", name: "string" } }
          ]
        },
        {
          name: "BasisIntent",
          isIntent: true,
          properties: [
            { name: "identity", optional: true, type: { kind: "model", name: "Identity" } }
          ]
        },
        {
          name: "Dialog",
          properties: [
            { name: "type", optional: false, type: { kind: "enum", name: "DialogType" } },
            { name: "resource", optional: true, type: { kind: "model", name: "Resource" } }
          ]
        },
        {
          name: "DialogIntent",
          isIntent: true,
          baseModelName: "BasisIntent",
          audience: "frontEnd",
          properties: [
            { name: "dialog", optional: false, type: { kind: "model", name: "Dialog" } }
          ]
        }
      ],
      unions: [
        {
          name: "Resource",
          variants: [
            { kind: "model", name: "Identity" }
          ]
        }
      ]
    };

    const typeScriptCode = generateIntentTypeScriptCode(specWithUnprefixedTypes, "frontEnd");
    const pythonCode = generateIntentPythonCode(specWithUnprefixedTypes, "frontEnd");

    assert.match(typeScriptCode, /\benum DialogType\b/);
    assert.doesNotMatch(typeScriptCode, /export enum DialogType\b/);
    assert.match(typeScriptCode, /export const IntentDialogType = DialogType;/);
    assert.match(typeScriptCode, /export type IntentDialogType = DialogType;/);
    assert.match(typeScriptCode, /\binterface Dialog\b/);
    assert.doesNotMatch(typeScriptCode, /export interface Dialog\b/);
    assert.match(typeScriptCode, /export type IntentDialog = Dialog;/);
    assert.match(typeScriptCode, /\binterface Identity\b/);
    assert.doesNotMatch(typeScriptCode, /export interface Identity\b/);
    assert.match(typeScriptCode, /export type IntentIdentity = Identity;/);
    assert.match(typeScriptCode, /\btype Resource = IntentIdentity;/);
    assert.doesNotMatch(typeScriptCode, /export type Resource\b/);
    assert.match(typeScriptCode, /export type IntentResource = Resource;/);
    assert.match(typeScriptCode, /export interface DialogIntent extends BasisIntent/);
    assert.match(typeScriptCode, /readonly dialog: IntentDialog;/);
    assert.doesNotMatch(typeScriptCode, /IntentDialogIntent/);
    assert.doesNotMatch(typeScriptCode, /IntentBasisIntent/);

    assert.match(pythonCode, /class _DialogType\(str, Enum\):/);
    assert.match(pythonCode, /IntentDialogType = _DialogType/);
    assert.match(pythonCode, /class _Dialog\(SuperDataClass\):/);
    assert.match(pythonCode, /IntentDialog = _Dialog/);
    assert.match(pythonCode, /class _Identity\(SuperDataClass\):/);
    assert.match(pythonCode, /IntentIdentity = _Identity/);
    assert.match(pythonCode, /_Resource = Union\[IntentIdentity]/);
    assert.match(pythonCode, /IntentResource = _Resource/);
    assert.match(pythonCode, /class DialogIntent\(BasisIntent\):/);
    assert.match(pythonCode, /dialog: IntentDialog/);
    assert.doesNotMatch(pythonCode, /class DialogType\(/);
    assert.doesNotMatch(pythonCode, /class Dialog\(/);
    assert.doesNotMatch(pythonCode, /class Identity\(/);
    assert.doesNotMatch(pythonCode, /\bResource =/);
    assert.doesNotMatch(pythonCode, /class _DialogIntent/);
    assert.doesNotMatch(pythonCode, /IntentDialogIntent/);
    assert.doesNotMatch(pythonCode, /IntentBasisIntent/);
  });
});
