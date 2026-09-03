import { createTypeSpecLibrary, EmitContext, emitFile, resolvePath } from "@typespec/compiler";

import { extractTypeSpecGrammarModel } from "./typespecModel.js";
import { generateTypeScriptCode } from "./typescriptGenerator.js";
import { generatePythonCode } from "./pythonGenerator.js";
import { generateReactCode } from "./reactGenerator.js";


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
} from "./decorators.js";

export interface FeatureViewGrammarEmitterOptions
{

  readonly "emitter-output-dir"?: string;
  readonly targets?: ("typescript" | "python" | "react")[];

}

export const $lib = createTypeSpecLibrary(
  {
    name: "@picteus/feature-view-grammar",
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

export async function $onEmit(context: EmitContext<FeatureViewGrammarEmitterOptions>): Promise<void>
{
  const program = context.program;
  const spec = extractTypeSpecGrammarModel(program);
  const targets = context.options.targets ?? [ "typescript", "python", "react" ];
  const outputDir = context.emitterOutputDir;

  if (targets.includes("typescript"))
  {
    const typeScriptCode = generateTypeScriptCode(spec);
    const typeScriptPath = resolvePath(outputDir, "typescript", "featureViewGrammar.ts");
    await emitFile(program, { path: typeScriptPath, content: typeScriptCode });
  }

  if (targets.includes("python"))
  {
    const pythonCode = generatePythonCode(spec);
    const pythonPath = resolvePath(outputDir, "python", "feature_view_grammar.py");
    await emitFile(program, { path: pythonPath, content: pythonCode });
  }

  if (targets.includes("react"))
  {
    const reactCode = generateReactCode(spec);
    const reactPath = resolvePath(outputDir, "react", "FeatureViewGrammar.tsx");
    await emitFile(program, { path: reactPath, content: reactCode });
  }
}
