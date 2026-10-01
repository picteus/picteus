import { createTypeSpecLibrary, EmitContext, emitFile, resolvePath } from "@typespec/compiler";

import { extractTypeSpecViewKitModel } from "./viewkit/typespecModel.js";
import { generateTypeScriptCode } from "./viewkit/typescriptGenerator.js";
import { generatePythonCode } from "./viewkit/pythonGenerator.js";
import { generateReactCode } from "./viewkit/reactGenerator.js";
import { extractTypeSpecIntents } from "./intents/intentsModel.js";
import { generateIntentPythonCode, generateIntentTypeScriptCode } from "./intents/intentsGenerator.js";
import { generateZodIntentsTypeScriptCode } from "./intents/zodGenerator.js";
import { PICTEUS_NAMESPACE } from "./common.js";


export {
  $dslRoot,
  $dslAlias,
  $dslIgnore,
  $uiLayout,
  $uiWidget,
  $uiLabel,
  $uiValue,
  $uiDivider,
  $uiMeterBound,
  $uiModifiers,
  $customRenderer,
  isDslRoot,
  getModelAliases,
  isDslIgnored,
  getUiLayout,
  getUiWidget,
  isUiLabel,
  isUiValue,
  getUiDivider,
  getUiMeterBound,
  isUiModifiers,
  isCustomRenderer,
  DslAliasName,
  UiLayoutKind,
  UiWidgetKind,
  UiDividerOrientation,
  UiDividerOptions,
  UiMeterBoundKind
} from "./viewkit/decorators.js";
export {
  $frontEndIntent,
  $backEndIntent,
  getIntentAudience,
  IntentAudience
} from "./intents/decorators.js";

export interface EmitterOptions
{

  readonly "emitter-output-dir"?: string;
  readonly targets?: ("typescript" | "python" | "react")[];

}

export const $lib = createTypeSpecLibrary(
  {
    name: "@picteus/specification-factory",
    diagnostics: {},
    emitter: {
      options: {
        type: "object",
        properties: {
          "emitter-output-dir": { type: "string", nullable: true },
          targets: {
            type: "array",
            items: { type: "string", enum: [ "typescript", "python", "react" ] },
            nullable: true
          }
        },
        required: []
      }
    }
  }
);

export async function $onEmit(context: EmitContext<EmitterOptions>): Promise<void>
{
  const program = context.program;
  const picteusNamespace = program.getGlobalNamespaceType().namespaces.get(PICTEUS_NAMESPACE);
  const shouldGenerateViewKit = picteusNamespace?.namespaces.has("ViewKit") ?? false;
  const shouldGenerateIntents = picteusNamespace?.namespaces.has("Intents") ?? false;
  const targets = context.options.targets ?? [ "typescript", "python", "react" ];
  const outputDir = context.emitterOutputDir;

  if (shouldGenerateViewKit)
  {
    const spec = extractTypeSpecViewKitModel(program);

    if (targets.includes("typescript"))
    {
      const typeScriptCode = generateTypeScriptCode(spec);
      const typeScriptPath = resolvePath(outputDir, "viewkit", "typescript", "viewKit.ts");
      await emitFile(program, { path: typeScriptPath, content: typeScriptCode });
    }

    if (targets.includes("python"))
    {
      const pythonCode = generatePythonCode(spec);
      const pythonPath = resolvePath(outputDir, "viewkit", "python", "view_kit.py");
      await emitFile(program, { path: pythonPath, content: pythonCode });
    }

    if (targets.includes("react"))
    {
      const reactCode = generateReactCode(spec);
      const reactPath = resolvePath(outputDir, "viewkit", "react", "ViewKit.tsx");
      await emitFile(program, { path: reactPath, content: reactCode });
    }
  }

  if (shouldGenerateIntents)
  {
    const intents = extractTypeSpecIntents(program);

    if (targets.includes("typescript"))
    {
      const frontEndIntentsTypeScriptCode = generateIntentTypeScriptCode(intents, "frontEnd");
      const frontEndIntentsTypeScriptPath = resolvePath(outputDir, "intents", "typescript", "frontEndIntents.ts");
      await emitFile(program, { path: frontEndIntentsTypeScriptPath, content: frontEndIntentsTypeScriptCode });

      const backEndIntentsTypeScriptCode = generateIntentTypeScriptCode(intents, "backEnd");
      const backEndIntentsTypeScriptPath = resolvePath(outputDir, "intents", "typescript", "backEndIntents.ts");
      await emitFile(program, { path: backEndIntentsTypeScriptPath, content: backEndIntentsTypeScriptCode });

      const zodIntentsTypeScriptCode = generateZodIntentsTypeScriptCode(intents);
      const zodIntentsTypeScriptPath = resolvePath(outputDir, "intents", "typescript", "intentsZod.ts");
      await emitFile(program, { path: zodIntentsTypeScriptPath, content: zodIntentsTypeScriptCode });
    }

    if (targets.includes("python"))
    {
      const frontEndIntentsPythonCode = generateIntentPythonCode(intents, "frontEnd");
      const frontEndIntentsPythonPath = resolvePath(outputDir, "intents", "python", "front_end_intents.py");
      await emitFile(program, { path: frontEndIntentsPythonPath, content: frontEndIntentsPythonCode });

      const backEndIntentsPythonCode = generateIntentPythonCode(intents, "backEnd");
      const backEndIntentsPythonPath = resolvePath(outputDir, "intents", "python", "back_end_intents.py");
      await emitFile(program, { path: backEndIntentsPythonPath, content: backEndIntentsPythonCode });
    }
  }

  if (!shouldGenerateViewKit && !shouldGenerateIntents)
  {
    throw new Error("The TypeSpec program must contain the Picteus.ViewKit or Picteus.Intents namespace.");
  }
}
