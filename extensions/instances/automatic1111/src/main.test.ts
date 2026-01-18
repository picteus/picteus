import { expect, test } from "@jest/globals";

import { Automatic1111UserComment } from "./main";


test("All", async () =>
{
  {
    const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative");
    expect(userComment.positive).toEqual("positive");
    expect(userComment.negative).toEqual("negative");
    expect(userComment.instructions.length).toEqual(0);
  }
  {
    const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nSteps: 20");
    expect(userComment.positive).toEqual("positive");
    expect(userComment.negative).toEqual("negative");
    expect(userComment.instructions.length).toEqual(1);
    expect(userComment.instructions[0].key).toEqual("Steps");
    expect(userComment.instructions[0].value).toEqual("20");
  }
  {
    const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nwith new line\nSteps: 20");
    expect(userComment.positive).toEqual("positive");
    expect(userComment.negative).toEqual("negative\nwith new line");
    expect(userComment.instructions.length).toEqual(1);
    expect(userComment.instructions[0].key).toEqual("Steps");
    expect(userComment.instructions[0].value).toEqual("20");
  }
  {
    const userComment = Automatic1111UserComment.parse("positive\nNegative prompt: negative\nwith new line\nSampler: DPM++ 2M Karras");
    expect(userComment.positive).toEqual("positive");
    expect(userComment.negative).toEqual("negative\nwith new line");
    expect(userComment.instructions.length).toEqual(1);
    expect(userComment.instructions[0].key).toEqual("Sampler");
    expect(userComment.instructions[0].value).toEqual("DPM++ 2M Karras");
  }
  {
    const userComment = Automatic1111UserComment.parse("masterpiece, best quality, double exposure, realistic, whimsical, fantastic, splash art, intricate detailed, hyperdetailed, maximalist style, psychedelic, photorealistic,sharp focus, harmony, serenity, tranquility,\n(yin yang symbol), miniature carribean beach scene, palms , cottage houses, night and day, miniature crescent moon, night sky, surrounding clouds, mysterious glow, perfectly round moon,\nambient occlusion, halation, cozy ambient lighting, dynamic lighting, double exposure, masterpiece, award winning,negativeXL_D, double exposure, linquivera, liiv1, mentixis, metix, vivid colors \nNegative prompt:  negativeXL_D, greyscale\nSteps: 22, Sampler: DPM++ 2M Karras, CFG scale: 3.8, Seed: 894409639, Size: 832x1216, Clip skip: 2, Created Date: 2024-09-23T06:17:42.9952795Z, Civitai resources: [{\"type\":\"checkpoint\",\"modelVersionId\":128078,\"modelName\":\"SD XL\",\"modelVersionName\":\"v1.0 VAE fix\"},{\"type\":\"lora\",\"weight\":0.85,\"modelVersionId\":210432,\"modelName\":\"Double Exposure\",\"modelVersionName\":\"Double Exposure\"},{\"type\":\"lora\",\"weight\":0.3,\"modelVersionId\":281935,\"modelName\":\"Linquivera\",\"modelVersionName\":\"v1.0\"},{\"type\":\"lora\",\"weight\":0.8,\"modelVersionId\":315064,\"modelName\":\"Mentixis\",\"modelVersionName\":\"v1.0\"},{\"type\":\"embed\",\"weight\":1,\"modelVersionId\":134583,\"modelName\":\"negativeXL\",\"modelVersionName\":\"D\"},{\"type\":\"embed\",\"modelVersionId\":106916,\"modelName\":\"Civitai Safe Helper\",\"modelVersionName\":\"v1.0\"}], Civitai metadata: {}");
    expect(userComment.positive).toEqual("masterpiece, best quality, double exposure, realistic, whimsical, fantastic, splash art, intricate detailed, hyperdetailed, maximalist style, psychedelic, photorealistic,sharp focus, harmony, serenity, tranquility,\n(yin yang symbol), miniature carribean beach scene, palms , cottage houses, night and day, miniature crescent moon, night sky, surrounding clouds, mysterious glow, perfectly round moon,\nambient occlusion, halation, cozy ambient lighting, dynamic lighting, double exposure, masterpiece, award winning,negativeXL_D, double exposure, linquivera, liiv1, mentixis, metix, vivid colors");
    expect(userComment.negative).toEqual("negativeXL_D, greyscale");
    expect(userComment.instructions.length).toEqual(9);
    expect(userComment.instructions[0].key).toEqual("Steps");
    expect(userComment.instructions[0].value).toEqual("22");
    expect(userComment.instructions[8].key).toEqual("Civitai metadata");
    expect(userComment.instructions[8].value).toEqual("{}");
  }
  {
    // noinspection RequiredAttributes
    const userComment = Automatic1111UserComment.parse(`FredFraiStyle "positive."

<lora:FredFraiStyle-FLUX-Share:0.95>
<lora:Ars_MidJourney_Style_-_Flux:0.6>
<lora:- Flux1 - vanta_black_V2.0:0.55>
Steps: 20, Sampler: Euler, Schedule type: Simple, CFG scale: 1, Distilled CFG Scale: 3.5, Seed: 3045329758, Size: 832x1216, Model hash: 06f96f89f6, Model: flux_dev, Lora hashes: "FredFraiStyle-FLUX-Share: de92428f6411, Ars_MidJourney_Style_-_Flux: c4f0b45e6a60, - Flux1 - vanta_black_V2.0: 5d8cf3724039", Version: f2.0.1v1.10.1-previous-561-g82eb7566`);
    expect(userComment.positive).toEqual(`FredFraiStyle "positive."`);
    expect(userComment.negative).toEqual("");
    expect(userComment.instructions.length).toEqual(13);
    expect(userComment.instructions[0].key).toEqual("Steps");
    expect(userComment.instructions[0].value).toEqual("20");
  }
  {
    const userComment = Automatic1111UserComment.parse(`positive\nNegative prompt: negative\nSteps: 50, Sampler: DPM++ 3M SDE Karras, CFG scale: 3.6, Seed: 1087151610341875, Size: 768x1344, Model hash: {\"key1\": \"value1\", \"key2\": {\"sub\": \"value2\"}}, Model: Kolors v1, Hashes: {\"model\": \"\"}, Version: ComfyUI`);
    expect(userComment.positive).toEqual(`positive`);
    expect(userComment.negative).toEqual("negative");
    expect(userComment.instructions.length).toEqual(9);
    expect(userComment.instructions[5].key).toEqual("Model hash");
    expect(userComment.instructions[5].value).toEqual(`{\"key1\": \"value1\", \"key2\": {\"sub\": \"value2\"}}`);
    expect(userComment.instructions[7].key).toEqual("Hashes");
    expect(userComment.instructions[7].value).toEqual(`{\"model\": \"\"}`);
  }
});
