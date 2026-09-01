import { createTypeSpecLibrary, EmitContext, emitFile, resolvePath } from "@typespec/compiler";

import { extractTypeSpecGrammarModel } from "./typespecModel.js";
import { generateTypeScriptCode } from "./typescriptGenerator.js";
import { generatePythonCode } from "./pythonGenerator.js";


export {
  $dslRoot,
  $dslAlias,
  $dslIgnore,
  isDslRoot,
  getModelAliases,
  isDslIgnored
} from "./decorators.js";

export interface FeatureViewGrammarEmitterOptions
{
  "emitter-output-dir"?: string;
  targets?: ("typescript" | "python")[];
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
            items: { type: "string", enum: [ "typescript", "python" ] },
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
  const targets = context.options.targets ?? [ "typescript", "python" ];
  const outputDir = context.emitterOutputDir;

  if (targets.includes("typescript"))
  {
    const tsCode = generateTypeScriptCode(spec);
    const tsPath = resolvePath(outputDir, "typescript", "featureViewGrammar.ts");
    await emitFile(program, { path: tsPath, content: tsCode });
  }

  if (targets.includes("python"))
  {
    const pyCode = generatePythonCode(spec);
    const pyPath = resolvePath(outputDir, "python", "feature_view_grammar.py");
    await emitFile(program, { path: pyPath, content: pyCode });
  }
}
