import { BasisIntent, FrontIntent, Json, WithContextIntent } from "@picteus/shared-core";


export interface IntentServeBundle
{
  readonly content: Buffer;
  readonly settings?: Json;
}

export interface BundleIntent extends BasisIntent
{
  readonly serveBundle: IntentServeBundle;
}

export interface IntentReadFile
{
  readonly extensions?: string [];
  readonly message: string;
}

export interface ReadFileIntent extends WithContextIntent
{
  readonly readFile: IntentReadFile;
}

export interface IntentWriteFile
{
  readonly name: string;
  readonly extension: string;
  readonly content: Buffer;
  readonly message: string;
}

export interface WriteFileIntent extends WithContextIntent
{
  readonly writeFile: IntentWriteFile;
}

export type BackIntent =
  | BundleIntent
  | ReadFileIntent
  | WriteFileIntent;

export type Intent = FrontIntent | BackIntent;
