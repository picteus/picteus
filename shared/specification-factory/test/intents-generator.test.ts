import { describe, test } from "node:test";
import { strict as assert } from "node:assert/strict";

import { generateIntentPythonCode, generateIntentTypeScriptCode } from "../src/emitter/intents/intentsGenerator.js";
import { IntentSpec } from "../src/emitter/intents/intentsModel.js";


const intentSpec: IntentSpec = {
  enums: [
    {
      name: "IntentStatus",
      members: [
        { name: "ready", value: "ready" }
      ]
    }
  ],
  models: [
    {
      name: "IntentIdentity",
      properties: [
        { name: "id", optional: false, type: { kind: "string", name: "string" } }
      ]
    },
    {
      name: "BasisIntent",
      properties: [
        { name: "identity", optional: true, type: { kind: "model", name: "IntentIdentity" } }
      ]
    },
    {
      name: "IntentFormContent",
      properties: [
        { name: "parameters", optional: false, type: { kind: "record", name: "Record" } }
      ]
    },
    {
      name: "FormIntent",
      baseModelName: "BasisIntent",
      audience: "frontEnd",
      properties: [
        { name: "form", optional: false, type: { kind: "model", name: "IntentFormContent" } }
      ]
    },
    {
      name: "IntentAction",
      properties: [
        { name: "intent", optional: false, type: { kind: "model", name: "ProcessCommandIntent" } }
      ]
    },
    {
      name: "ProcessCommandIntent",
      baseModelName: "BasisIntent",
      properties: [
        { name: "processCommand", optional: false, type: { kind: "string", name: "string" } }
      ]
    },
    {
      name: "ActionIntent",
      baseModelName: "BasisIntent",
      audience: "frontEnd",
      properties: [
        { name: "action", optional: false, type: { kind: "model", name: "IntentAction" } }
      ]
    },
    {
      name: "IntentServeBundle",
      properties: [
        { name: "content", optional: false, type: { kind: "bytes", name: "bytes" } }
      ]
    },
    {
      name: "ServeBundleIntent",
      baseModelName: "BasisIntent",
      audience: "backEnd",
      properties: [
        { name: "serveBundle", optional: false, type: { kind: "model", name: "IntentServeBundle" } }
      ]
    }
  ],
  unions: [
    {
      name: "IntentResource",
      variants: [
        { kind: "model", name: "IntentIdentity" }
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
    assert.match(frontEndTypeScriptCode, /readonly parameters: IntentJson;/);
    assert.match(backEndPythonCode, /BackIntent = Union\[ServeBundleIntent]/);
    assert.doesNotMatch(backEndPythonCode, /FrontIntent|FormIntent/);
    assert.match(backEndPythonCode, /content: bytearray/);
    assert.match(frontEndPythonCode, /FrontIntent = Union\[FormIntent, ActionIntent]/);
    assert.match(frontEndPythonCode, /parameters: Json/);
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
});
