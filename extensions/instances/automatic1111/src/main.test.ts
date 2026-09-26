import { test } from "node:test";
import { strict as assert } from "node:assert/strict";

import { Automatic1111Instruction, Automatic1111UserComment } from "./instructions";


test("Parses positive and negative prompt without instructions", () =>
{
  const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative");
  assert.equal(userComment.positive, "positive");
  assert.equal(userComment.negative, "negative");
  assert.equal(userComment.instructions.length, 0);
});

test("Parses positive, negative prompt and single instruction", () =>
{
  const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nSteps: 20");
  assert.equal(userComment.positive, "positive");
  assert.equal(userComment.negative, "negative");
  assert.equal(userComment.instructions.length, 1);
  assert.equal(userComment.instructions[0].key, "Steps");
  assert.equal(userComment.instructions[0].value, "20");
});

test("Parses multiline negative prompt with instructions", () =>
{
  const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nwith new line\nSteps: 20");
  assert.equal(userComment.positive, "positive");
  assert.equal(userComment.negative, "negative\nwith new line");
  assert.equal(userComment.instructions.length, 1);
  assert.equal(userComment.instructions[0].key, "Steps");
  assert.equal(userComment.instructions[0].value, "20");
});

test("Parses instructions with sampler name", () =>
{
  const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nwith new line\nSampler: DPM++ 2M Karras");
  assert.equal(userComment.positive, "positive");
  assert.equal(userComment.negative, "negative\nwith new line");
  assert.equal(userComment.instructions.length, 1);
  assert.equal(userComment.instructions[0].key, "Sampler");
  assert.equal(userComment.instructions[0].value, "DPM++ 2M Karras");
});

test("Parses complex prompt with Civitai resources and metadata", () =>
{
  const userComment = Automatic1111UserComment.parse("masterpiece, best quality, double exposure, realistic, whimsical, fantastic, splash art, intricate detailed, hyperdetailed, maximalist style, psychedelic, photorealistic,sharp focus, harmony, serenity, tranquility,\n(yin yang symbol), miniature carribean beach scene, palms , cottage houses, night and day, miniature crescent moon, night sky, surrounding clouds, mysterious glow, perfectly round moon,\nambient occlusion, halation, cozy ambient lighting, dynamic lighting, double exposure, masterpiece, award winning,negativeXL_D, double exposure, linquivera, liiv1, mentixis, metix, vivid colors \nNegative prompt:  negativeXL_D, greyscale\nSteps: 22, Sampler: DPM++ 2M Karras, CFG scale: 3.8, Seed: 894409639, Size: 832x1216, Clip skip: 2, Created Date: 2024-09-23T06:17:42.9952795Z, Civitai resources: [{\"type\":\"checkpoint\",\"modelVersionId\":128078,\"modelName\":\"SD XL\",\"modelVersionName\":\"v1.0 VAE fix\"},{\"type\":\"lora\",\"weight\":0.85,\"modelVersionId\":210432,\"modelName\":\"Double Exposure\",\"modelVersionName\":\"Double Exposure\"},{\"type\":\"lora\",\"weight\":0.3,\"modelVersionId\":281935,\"modelName\":\"Linquivera\",\"modelVersionName\":\"v1.0\"},{\"type\":\"lora\",\"weight\":0.8,\"modelVersionId\":315064,\"modelName\":\"Mentixis\",\"modelVersionName\":\"v1.0\"},{\"type\":\"embed\",\"weight\":1,\"modelVersionId\":134583,\"modelName\":\"negativeXL\",\"modelVersionName\":\"D\"},{\"type\":\"embed\",\"modelVersionId\":106916,\"modelName\":\"Civitai Safe Helper\",\"modelVersionName\":\"v1.0\"}], Civitai metadata: {}");
  assert.equal(userComment.positive, "masterpiece, best quality, double exposure, realistic, whimsical, fantastic, splash art, intricate detailed, hyperdetailed, maximalist style, psychedelic, photorealistic,sharp focus, harmony, serenity, tranquility,\n(yin yang symbol), miniature carribean beach scene, palms , cottage houses, night and day, miniature crescent moon, night sky, surrounding clouds, mysterious glow, perfectly round moon,\nambient occlusion, halation, cozy ambient lighting, dynamic lighting, double exposure, masterpiece, award winning,negativeXL_D, double exposure, linquivera, liiv1, mentixis, metix, vivid colors");
  assert.equal(userComment.negative, "negativeXL_D, greyscale");
  assert.equal(userComment.instructions.length, 9);
  assert.equal(userComment.instructions[0].key, "Steps");
  assert.equal(userComment.instructions[0].value, "22");
  assert.equal(userComment.instructions[8].key, "Civitai metadata");
  assert.deepEqual(userComment.instructions[8].value, {});

  const civitaiInstruction = userComment.instructions[7];
  assert.equal(civitaiInstruction.key, "Civitai resources");
  assert.deepEqual(civitaiInstruction.value[0], {
    type: "checkpoint",
    modelVersionId: 128078,
    modelName: "SD XL",
    modelVersionName: "v1.0 VAE fix"
  });
  assert.deepEqual(civitaiInstruction.value[1], {
    type: "lora",
    weight: 0.85,
    modelVersionId: 210432,
    modelName: "Double Exposure",
    modelVersionName: "Double Exposure"
  });

  assert.equal(userComment.getInceptionDate(), Date.parse("2024-09-23T06:17:42.9952795Z"));
  assert.equal(userComment.getAspectRatio(), 832 / 1216);
  assert.deepEqual(userComment.computeRecipeAttributes(), {
    inceptionDate: Date.parse("2024-09-23T06:17:42.9952795Z")
  });
});

test("Parses Flux prompt with embedded LoRAs and no negative prompt", () =>
{
  const userComment = Automatic1111UserComment.parse(`FredFraiStyle "positive."

<lora:FredFraiStyle-FLUX-Share:0.95>
<lora:Ars_MidJourney_Style_-_Flux:0.6>
<lora:- Flux1 - vanta_black_V2.0:0.55>
Steps: 20, Sampler: Euler, Schedule type: Simple, CFG scale: 1, Distilled CFG Scale: 3.5, Seed: 3045329758, Size: 832x1216, Model hash: 06f96f89f6, Model: flux_dev, Lora hashes: "FredFraiStyle-FLUX-Share: de92428f6411, Ars_MidJourney_Style_-_Flux: c4f0b45e6a60, - Flux1 - vanta_black_V2.0: 5d8cf3724039", Version: f2.0.1v1.10.1-previous-561-g82eb7566`);
  assert.equal(userComment.positive, `FredFraiStyle "positive."\n\n<lora:FredFraiStyle-FLUX-Share:0.95>\n<lora:Ars_MidJourney_Style_-_Flux:0.6>\n<lora:- Flux1 - vanta_black_V2.0:0.55>`);
  assert.equal(userComment.negative, "");
  assert.equal(userComment.instructions.length, 11);
  assert.equal(userComment.instructions[0].key, "Steps");
  assert.equal(userComment.instructions[0].value, "20");
  assert.equal(userComment.instructions[9].key, "Lora hashes");
  assert.equal(
    userComment.instructions[9].value,
    "\"FredFraiStyle-FLUX-Share: de92428f6411, Ars_MidJourney_Style_-_Flux: c4f0b45e6a60, - Flux1 - vanta_black_V2.0: 5d8cf3724039\""
  );
});

test("Parses nested JSON structures within instruction values", () =>
{
  const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nSteps: 50, Sampler: DPM++ 3M SDE Karras, CFG scale: 3.6, Seed: 1087151610341875, Size: 768x1344, Model hash: {\"key1\": \"value1: with colon, and comma\", \"key2\": {\"sub\": \"value2\"}}, Model: Kolors v1, Hashes: {\"model\": \"\"}, Civitai metadata: {\"prompt\": \"a, b: c\", \"resources\": [{\"id\": 1, \"name\": \"SD XL, v1.0\"}]}, Version: ComfyUI");
  assert.equal(userComment.positive, "positive");
  assert.equal(userComment.negative, "negative");
  assert.equal(userComment.instructions.length, 10);
  assert.equal(userComment.instructions[5].key, "Model hash");
  assert.deepEqual(userComment.instructions[5].value, {
    key1: "value1: with colon, and comma",
    key2: {
      sub: "value2"
    }
  });
  assert.equal(userComment.instructions[7].key, "Hashes");
  assert.deepEqual(userComment.instructions[7].value, { model: "" });
  assert.equal(userComment.instructions[8].key, "Civitai metadata");
  assert.deepEqual(userComment.instructions[8].value, {
    prompt: "a, b: c",
    resources: [
      { id: 1, name: "SD XL, v1.0" }
    ]
  });
});

test("Parses ControlNet parameters with parenthesized tuples", () =>
{
  const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nSteps: 20, ControlNet 0: \"preprocessor: canny, model: control_v11p_sd15_canny [d14c016b], weight: 1.0, starting/ending: (0.0, 1.0), resize mode: Crop and Resize, pixel perfect: True, control mode: Balanced, preprocessor params: (512, 100, 200)\", Size: 512x512");
  assert.equal(userComment.instructions.length, 3);
  assert.equal(userComment.instructions[0].key, "Steps");
  assert.equal(userComment.instructions[0].value, "20");
  assert.equal(userComment.instructions[1].key, "ControlNet 0");
  assert.equal(
    userComment.instructions[1].value,
    "\"preprocessor: canny, model: control_v11p_sd15_canny [d14c016b], weight: 1.0, starting/ending: (0.0, 1.0), resize mode: Crop and Resize, pixel perfect: True, control mode: Balanced, preprocessor params: (512, 100, 200)\""
  );
  assert.equal(userComment.instructions[2].key, "Size");
  assert.equal(userComment.instructions[2].value, "512x512");
});

test("Automatic1111Instruction only contains key and value properties", () =>
{
  const instruction = new Automatic1111Instruction(
    "Civitai resources",
    "[{\"type\":\"checkpoint\",\"modelVersionId\":128078,\"modelName\":\"SD XL\",\"modelVersionName\":\"v1.0 VAE fix\"}]"
  );
  assert.equal(instruction.key, "Civitai resources");
  assert.equal(
    instruction.value,
    "[{\"type\":\"checkpoint\",\"modelVersionId\":128078,\"modelName\":\"SD XL\",\"modelVersionName\":\"v1.0 VAE fix\"}]"
  );
  assert.equal(Object.keys(instruction).sort().join(","), "key,value");
  // @ts-expect-error civitaiResources should not exist on Automatic1111Instruction
  assert.equal(instruction.civitaiResources, undefined);
});

test("Automatic1111UserComment.parseValue parses JSON arrays and objects, and preserves strings", () =>
{
  assert.deepEqual(Automatic1111UserComment.parseValue("[{\"type\":\"checkpoint\"}]"), [ { type: "checkpoint" } ]);
  assert.deepEqual(Automatic1111UserComment.parseValue("{\"key\":\"value\"}"), { key: "value" });
  assert.deepEqual(Automatic1111UserComment.parseValue("[]"), []);
  assert.deepEqual(Automatic1111UserComment.parseValue("{}"), {});
  assert.equal(Automatic1111UserComment.parseValue("22"), "22");
  assert.equal(Automatic1111UserComment.parseValue("DPM++ 2M Karras"), "DPM++ 2M Karras");
  assert.equal(Automatic1111UserComment.parseValue("{ not valid json }"), "{ not valid json }");
  assert.deepEqual(Automatic1111UserComment.parseValue("  {\"a\": 1}  "), { a: 1 });
});

test("Automatic1111UserComment.toUiContainer generates valid UiContainer with Dimensions and Seed, omitting Civitai fields and Created Date", () =>
{
  const userComment = Automatic1111UserComment.parse("positive prompt text\nNegative prompt: negative prompt text\nSteps: 20, Sampler: Euler, Seed: 894409639, Size: 832x1216, CFG scale: 7, Model: SD XL, Clip skip: 2, Created Date: 2024-09-23T06:17:42.9952795Z, Civitai resources: [{\"type\":\"checkpoint\"}], Civitai metadata: {}");
  const uiContainer = userComment.toUiContainer();
  assert.ok(uiContainer !== undefined);
  const jsonString = uiContainer.toString();
  assert.ok(jsonString.includes("Prompt"));
  assert.ok(jsonString.includes("positive prompt text"));
  assert.ok(jsonString.includes("Negative Prompt"));
  assert.ok(jsonString.includes("negative prompt text"));
  assert.ok(jsonString.includes("Steps"));
  assert.ok(jsonString.includes("Sampler"));
  assert.ok(jsonString.includes("CFG scale"));
  assert.ok(jsonString.includes("Dimensions"));
  assert.ok(jsonString.includes("832"));
  assert.ok(jsonString.includes("1216"));
  assert.ok(jsonString.includes("894409639"));
  assert.ok(jsonString.includes("Details"));
  assert.ok(jsonString.includes("2 properties"));
  assert.ok(jsonString.includes("Model"));
  assert.ok(jsonString.includes("Clip skip"));
  assert.ok(jsonString.includes("Created Date") === false);
  assert.ok(jsonString.includes("Civitai resources") === false);
  assert.ok(jsonString.includes("Civitai metadata") === false);
});
