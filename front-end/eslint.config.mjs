import fs from "node:fs";
import path from "node:path";

import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";


const SOURCE_ROOT = path.resolve(import.meta.dirname, "src");
const TYPESCRIPT_EXTENSIONS = [ ".ts", ".tsx" ];
const INDEX_SUFFIX_PATTERN = /\/index(?:\.tsx?)?$/;
const SOURCE_TOP_ENTRIES = new Set(fs.readdirSync(SOURCE_ROOT).map(entry => entry.replace(/\.tsx?$/, "")));

function isExistingFile(filePath)
{
  return fs.statSync(filePath, { throwIfNoEntry: false })?.isFile() === true;
}

function hasBarrelIndex(directoryPath)
{
  return TYPESCRIPT_EXTENSIONS.some(extension => isExistingFile(path.join(directoryPath, `index${extension}`)));
}

function resolveImportTarget(specifier, filename)
{
  if (specifier.startsWith("."))
  {
    return path.resolve(path.dirname(filename), specifier);
  }
  if (SOURCE_TOP_ENTRIES.has(specifier.split("/")[0]))
  {
    return path.resolve(SOURCE_ROOT, specifier);
  }
  return null;
}

function computeReplacement(specifier, targetPath)
{
  if (INDEX_SUFFIX_PATTERN.test(specifier))
  {
    if (hasBarrelIndex(path.dirname(targetPath)))
    {
      return specifier.replace(INDEX_SUFFIX_PATTERN, "") || ".";
    }
    return null;
  }

  if (isExistingFile(targetPath) || hasBarrelIndex(targetPath))
  {
    return null;
  }

  const resolvedExtension = TYPESCRIPT_EXTENSIONS.find(
    candidateExtension => isExistingFile(`${targetPath}${candidateExtension}`)
  );
  return resolvedExtension !== undefined ? `${specifier}${resolvedExtension}` : null;
}

const importExtensionsRule =
{
  meta:
  {
    type: "suggestion",
    fixable: "code",
    schema: []
  },
  create(context)
  {
    function checkSource(source)
    {
      if (!source || typeof source.value !== "string")
      {
        return;
      }

      const targetPath = resolveImportTarget(source.value, context.filename);
      const replacement = targetPath !== null ? computeReplacement(source.value, targetPath) : null;
      if (replacement === null)
      {
        return;
      }

      const quote = source.raw[0];
      context.report(
      {
        node: source,
        message: `Use "${replacement}" instead of "${source.value}".`,
        fix: fixer => fixer.replaceText(source, `${quote}${replacement}${quote}`)
      });
    }

    return {
      ImportDeclaration: node => checkSource(node.source),
      ExportNamedDeclaration: node => checkSource(node.source),
      ExportAllDeclaration: node => checkSource(node.source)
    };
  }
};


export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      ".eslintrc.cjs",
      "eslint.config.js",
      "src/generated/**",
      "picteus-ws-client/**"
    ]
  },
  ...typescriptPlugin.configs["flat/recommended"],
  {
    files: [ "**/*.{ts,tsx}" ],
    plugins:
    {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      local: { rules: { "import-extensions": importExtensionsRule } }
    },
    languageOptions:
    {
      globals:
      {
        ...globals.browser,
        ...globals.es2020
      }
    },
    rules:
    {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-unused-vars": [ "warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_"
      } ],
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "local/import-extensions": "error"
    }
  }
];
