import { DecoratorContext, Model, Program } from "@typespec/compiler";

import { PICTEUS_NAMESPACE } from "../common.js";


export const namespace = `${PICTEUS_NAMESPACE}.Intents`;

export type IntentAudience = "frontEnd" | "backEnd";

const intentAudiences = new WeakMap<Model, IntentAudience>();

export function $frontEndIntent(context: DecoratorContext, target: Model): void
{
  intentAudiences.set(target, "frontEnd");
}

export function $backEndIntent(context: DecoratorContext, target: Model): void
{
  intentAudiences.set(target, "backEnd");
}

export function getIntentAudience(program: Program, target: Model): IntentAudience | undefined
{
  return intentAudiences.get(target);
}
