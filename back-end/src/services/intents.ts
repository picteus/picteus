import { FrontIntent } from "@picteus/shared-core";
import { BackIntent } from "../generated/backEndIntents";


export * from "../generated/backEndIntents";
export * from "../generated/intentsZod";

export type Intent = FrontIntent | BackIntent;
