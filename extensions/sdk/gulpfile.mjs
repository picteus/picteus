import path from "node:path";
import fs from "node:fs";
import process from "node:process";

import gulp from "gulp";
import gulpRun from "gulp-run";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import toJSONSchema from "openapi-schema-to-json-schema";


const pythonPublicSdkName = "picteus-extension-sdk";
const nodePublicSdkName = "@picteus/extension-sdk";

function computeTypeScriptDirectoryPath(workingDirectoryPath)
{
  return path.join(workingDirectoryPath, "typescript");
}

function computeTypeScriptPackageFilePath(workingDirectoryPath)
{
  return path.join(computeTypeScriptDirectoryPath(workingDirectoryPath), "package.json");
}

function computePythonDirectoryPath(workingDirectoryPath)
{
  return path.join(workingDirectoryPath, "python");
}

function computePythonPyProjectFilePath(workingDirectoryPath)
{
  return path.join(computePythonDirectoryPath(workingDirectoryPath), "pyproject.toml");
}

// noinspection JSUnusedGlobalSymbols
export const updateVersion = gulp.series(
  () =>
  {
    const workingDirectoryPath = path.resolve(".");
    const version = JSON.parse(fs.readFileSync(path.join(workingDirectoryPath, "..", "..", "package.json"), { encoding: "utf8" }))["config"]["sdkVersion"];
    {
      const filePath = computeTypeScriptPackageFilePath(workingDirectoryPath);
      const json = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
      json["version"] = version;
      fs.writeFileSync(filePath, JSON.stringify(json, undefined, 2) + "\n");
    }
    {
      {
        const filePath = computePythonPyProjectFilePath(workingDirectoryPath);
        const string = fs.readFileSync(filePath, { encoding: "utf8" });
        fs.writeFileSync(filePath, string.replace(/version = "(\d+\.\d+\.\d+)"/g, `version = "${version}"`));
      }
      {
        const filePath = path.join(computePythonDirectoryPath(workingDirectoryPath), "picteus_extension_sdk", "__init__.py");
        const string = fs.readFileSync(filePath, { encoding: "utf8" });
        const newString = string.replace(/__version__: str = "(\d+\.\d+\.\d+)"/g, `__version__: str = "${version}"`);
        fs.writeFileSync(filePath, newString);
      }
    }
    return Promise.resolve();
  }
);

// noinspection JSUnusedGlobalSymbols
export const tweakForPublicSdk = gulp.series(
  () =>
  {
    const workingDirectoryPath = path.resolve(".");
    {
      {
        const filePath = computeTypeScriptPackageFilePath(workingDirectoryPath);
        const packageJson = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
        packageJson["name"] = nodePublicSdkName;
        packageJson["private"] = false;
        fs.writeFileSync(filePath, JSON.stringify(packageJson, undefined, 2));
      }
      {
        const filePath = computePythonPyProjectFilePath(workingDirectoryPath);
        const string = fs.readFileSync(filePath, { encoding: "utf8" });
        fs.writeFileSync(filePath, string.replace(/name = "(.*)"/g, `name = "${pythonPublicSdkName}"`));
      }
    }
    {
      const parentDirectoryPath = path.join(workingDirectoryPath, "..");
      const packageJsonFilePath = path.join(parentDirectoryPath, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
      const config = packageJson["config"];
      config["referenceRelativePath"] = "../../server";
      config["buildRelativePath"] = "build";
      config["sdkRelativePath"] = "sdk";
      fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, undefined, 2));

      let environmentFileName;
      let npmScript;
      const cliArguments = process.argv;
      for (let index = 0; index < cliArguments.length; index++)
      {
        const argument = cliArguments[index];
        if (argument === "--environmentFileName" && (index + 1) < cliArguments.length)
        {
          environmentFileName = cliArguments[index + 1];
        }
        if (argument === "--npmScript" && (index + 1) < cliArguments.length)
        {
          npmScript = cliArguments[index + 1];
        }
      }
      const environmentFilePath = path.join(parentDirectoryPath, environmentFileName);

      // We spawn a new process because this is a way to discard the inherited environment variables
      const env = process.env;
      const content = fs.readFileSync(environmentFilePath, { encoding: "utf8" });
      const lines = content.split("\n");
      for (const line of lines)
      {
        const tokens = line.split("=");
        if (tokens.length === 2)
        {
          const variableName = tokens[0].trim();
          console.debug("Deleting the environment variable '" + variableName + "'");
          delete env[variableName];
        }
      }
      return gulpRun(`npm run ${npmScript}`, {
        cwd: parentDirectoryPath,
        verbosity: 3,
        env
      }).exec(undefined, undefined);
    }

  }
);

// noinspection JSUnusedGlobalSymbols
export const generateSchema = async () =>
{
  function restoreCustomBounds(openapiSchema, jsonSchema)
  {
    if (!openapiSchema || typeof openapiSchema !== "object" || !jsonSchema || typeof jsonSchema !== "object" || Array.isArray(openapiSchema) !== Array.isArray(jsonSchema))
    {
      return;
    }

    if (Array.isArray(openapiSchema) === true)
    {
      const length = Math.min(openapiSchema.length, jsonSchema.length);
      for (let index = 0; index < length; index++)
      {
        restoreCustomBounds(openapiSchema[index], jsonSchema[index]);
      }
      return;
    }

    function restoreBound(boundKey, exclusiveKey, isStricterInclusive)
    {
      const bound = openapiSchema[boundKey];
      const exclusive = openapiSchema[exclusiveKey];
      if (typeof exclusive === "number")
      {
        if (typeof bound === "number" && isStricterInclusive(bound, exclusive) === true)
        {
          jsonSchema[boundKey] = bound;
          delete jsonSchema[exclusiveKey];
        }
        else
        {
          jsonSchema[boundKey] = exclusive;
          jsonSchema[exclusiveKey] = true;
        }
      }
      else if (typeof bound === "number")
      {
        jsonSchema[boundKey] = bound;
        if (exclusive === true)
        {
          jsonSchema[exclusiveKey] = true;
        }
        else
        {
          delete jsonSchema[exclusiveKey];
        }
      }
      else
      {
        delete jsonSchema[exclusiveKey];
      }
    }

    function restoreMap(openapiMap, jsonMap)
    {
      if (openapiMap && typeof openapiMap === "object" && jsonMap && typeof jsonMap === "object")
      {
        for (const key in openapiMap)
        {
          restoreCustomBounds(openapiMap[key], jsonMap[key]);
        }
      }
    }

    restoreBound("minimum", "exclusiveMinimum", (bound, exclusive) => bound > exclusive);
    restoreBound("maximum", "exclusiveMaximum", (bound, exclusive) => bound < exclusive);

    restoreMap(openapiSchema.properties, jsonSchema.properties);
    restoreMap(openapiSchema.patternProperties ?? openapiSchema["x-patternProperties"], jsonSchema.patternProperties);

    for (const key of [ "items", "additionalProperties", "not", "allOf", "anyOf", "oneOf" ])
    {
      restoreCustomBounds(openapiSchema[key], jsonSchema[key]);
    }
  }

  const discriminatorBranchValuesKey = "__discriminatorBranchValues";

  function resolveDiscriminatorBranchValues(openApiDocument)
  {
    function normalizeReference(reference)
    {
      if (typeof reference !== "string")
      {
        return undefined;
      }
      return reference.includes("/") === false && reference.startsWith("#") === false
        ? `#/components/schemas/${reference}`
        : reference;
    }

    function walk(node)
    {
      if (!node || typeof node !== "object")
      {
        return;
      }
      if (Array.isArray(node) === true)
      {
        for (const item of node)
        {
          walk(item);
        }
        return;
      }

      if (node.discriminator && typeof node.discriminator === "object" &&
        typeof node.discriminator.propertyName === "string")
      {
        const branches = node.oneOf ?? node.anyOf;
        if (Array.isArray(branches) === true)
        {
          const mapping = node.discriminator.mapping;
          const referenceToValues = new Map();
          if (mapping && typeof mapping === "object")
          {
            for (const [ discriminatorValue, targetReference ] of Object.entries(mapping))
            {
              const normalizedReference = normalizeReference(targetReference);
              if (normalizedReference !== undefined)
              {
                if (referenceToValues.has(normalizedReference) === false)
                {
                  referenceToValues.set(normalizedReference, []);
                }
                referenceToValues.get(normalizedReference).push(discriminatorValue);
              }
            }
          }

          node[discriminatorBranchValuesKey] = branches.map(branch =>
          {
            if (!branch || typeof branch !== "object" || typeof branch.$ref !== "string")
            {
              return undefined;
            }
            if (mapping && typeof mapping === "object")
            {
              return referenceToValues.get(normalizeReference(branch.$ref));
            }
            const segments = branch.$ref.split("/");
            return [ segments[segments.length - 1] ];
          });
        }
      }

      for (const value of Object.values(node))
      {
        walk(value);
      }
    }

    walk(openApiDocument);
  }

  function applyDiscriminatorConstraints(schema)
  {
    const visited = new Set();

    function constrainBranch(branch, propertyName, allowedValues)
    {
      if (!branch || typeof branch !== "object")
      {
        return branch;
      }
      const clonedBranch = { ...branch };
      const clonedProperties = { ...(clonedBranch.properties ?? {}) };
      const existingProperty = clonedProperties[propertyName];
      let constrainedProperty;

      if (existingProperty && typeof existingProperty === "object")
      {
        constrainedProperty = { ...existingProperty };
        let hasNarrowedNestedEnum = false;
        if (Array.isArray(constrainedProperty.allOf) === true)
        {
          constrainedProperty.allOf = constrainedProperty.allOf.map(entry =>
          {
            if (entry && typeof entry === "object" && Array.isArray(entry.enum) === true)
            {
              hasNarrowedNestedEnum = true;
              return { ...entry, enum: [ ...allowedValues ] };
            }
            return entry;
          });
        }
        if (Array.isArray(constrainedProperty.enum) === true || hasNarrowedNestedEnum === false)
        {
          constrainedProperty.enum = [ ...allowedValues ];
        }
      }
      else
      {
        constrainedProperty = { type: "string", enum: [ ...allowedValues ] };
      }

      clonedProperties[propertyName] = constrainedProperty;
      clonedBranch.properties = clonedProperties;
      if (Array.isArray(clonedBranch.required) === true)
      {
        if (clonedBranch.required.includes(propertyName) === false)
        {
          clonedBranch.required = [ ...clonedBranch.required, propertyName ];
        }
      }
      else
      {
        clonedBranch.required = [ propertyName ];
      }
      return clonedBranch;
    }

    function walk(node)
    {
      if (!node || typeof node !== "object" || visited.has(node) === true)
      {
        return;
      }
      visited.add(node);

      if (Array.isArray(node) === true)
      {
        for (const item of node)
        {
          walk(item);
        }
        return;
      }

      const branchValues = node[discriminatorBranchValuesKey];
      delete node[discriminatorBranchValuesKey];
      if (Array.isArray(branchValues) === true && node.discriminator && typeof node.discriminator.propertyName === "string")
      {
        const propertyName = node.discriminator.propertyName;
        for (const unionKey of [ "oneOf", "anyOf" ])
        {
          if (Array.isArray(node[unionKey]) === true)
          {
            node[unionKey] = node[unionKey].map((branch, index) =>
            {
              const allowedValues = branchValues[index];
              return Array.isArray(allowedValues) === true && allowedValues.length > 0
                ? constrainBranch(branch, propertyName, allowedValues)
                : branch;
            });
          }
        }
      }

      for (const value of Object.values(node))
      {
        walk(value);
      }
    }

    walk(schema);
  }

  const cliArguments = process.argv;
  const inputFilePathOption = "--inputFilePath";
  const outputFilePathOption = "--outputFilePath";
  const entityOption = "--entity";
  const schemaIdOption = "--schemaId";
  const usage = `Usage: gulp generateManifestSchema ${inputFilePathOption} <openApiFilePath> ${outputFilePathOption} <jsonSchemaFilePath> ${entityOption} <entity> ${schemaIdOption} <schemaId>`;
  let inputFilePath;
  {
    const index = cliArguments.indexOf(inputFilePathOption);
    if (index === -1 || index > cliArguments.length)
    {
      throw new Error(usage);
    }
    inputFilePath = cliArguments[index + 1];
  }
  let outputFilePath;
  {
    const index = cliArguments.indexOf(outputFilePathOption);
    if (index === -1 || index > cliArguments.length)
    {
      throw new Error(usage);
    }
    outputFilePath = cliArguments[index + 1];
  }
  let entity;
  {
    const index = cliArguments.indexOf(entityOption);
    if (index === -1 || index > cliArguments.length)
    {
      throw new Error(usage);
    }
    entity = cliArguments[index + 1];
  }
  let schemaId;
  {
    const index = cliArguments.indexOf(schemaIdOption);
    if (index === -1 || index > cliArguments.length)
    {
      throw new Error(usage);
    }
    schemaId = cliArguments[index + 1];
  }

  // We parse first so we can capture discriminator branch $refs before dereferencing replaces them
  const referenceParser = new $RefParser();
  const openApiDocument = await referenceParser.parse(inputFilePath);
  resolveDiscriminatorBranchValues(openApiDocument);

  // We dereference the entire openapi.json file
  const dereferencedOpenApi = await referenceParser.dereference(openApiDocument);

  // We extract the target entity schema
  const manifestOpenApiSchema = dereferencedOpenApi.components.schemas[entity];

  // We enforce OpenAPI discriminator mappings onto each oneOf/anyOf branch before stripping discriminator
  applyDiscriminatorConstraints(manifestOpenApiSchema);

  // We convert the OpenAPI schema to JSON schema
  const jsonSchema = toJSONSchema(manifestOpenApiSchema, { supportPatternProperties: true });

  // We restore overwritten custom numerical bounds (minimum, maximum, etc.)
  restoreCustomBounds(manifestOpenApiSchema, jsonSchema);

  const finalSchema =
    {
      $schema: "http://json-schema.org/draft-04/schema#",
      $id: schemaId,
      title: entity,
      ...jsonSchema
    };

  fs.writeFileSync(outputFilePath, JSON.stringify(finalSchema, null, 2) + "\n");
  console.log(`Successfully generated the JSON Schema for 'Manifest' into file '${outputFilePath}'`);
  return Promise.resolve();
};
