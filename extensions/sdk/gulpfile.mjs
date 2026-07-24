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

function restoreCustomBounds(openapiSchema, jsonSchema)
{
  if (!openapiSchema || typeof openapiSchema !== "object" || !jsonSchema || typeof jsonSchema !== "object")
  {
    return;
  }
  if ("minimum" in openapiSchema)
  {
    jsonSchema.minimum = openapiSchema.minimum;
  }
  if ("maximum" in openapiSchema)
  {
    jsonSchema.maximum = openapiSchema.maximum;
  }
  if ("exclusiveMinimum" in openapiSchema)
  {
    jsonSchema.exclusiveMinimum = openapiSchema.exclusiveMinimum;
  }
  if ("exclusiveMaximum" in openapiSchema)
  {
    jsonSchema.exclusiveMaximum = openapiSchema.exclusiveMaximum;
  }
  if (openapiSchema.properties && jsonSchema.properties)
  {
    for (const key in openapiSchema.properties)
    {
      if (jsonSchema.properties[key])
      {
        restoreCustomBounds(openapiSchema.properties[key], jsonSchema.properties[key]);
      }
    }
  }

  if (openapiSchema.items && jsonSchema.items)
  {
    restoreCustomBounds(openapiSchema.items, jsonSchema.items);
  }

  if (openapiSchema.additionalProperties && typeof openapiSchema.additionalProperties === "object" &&
    jsonSchema.additionalProperties && typeof jsonSchema.additionalProperties === "object")
  {
    restoreCustomBounds(openapiSchema.additionalProperties, jsonSchema.additionalProperties);
  }

  const combinators = [ "allOf", "anyOf", "oneOf" ];
  for (const combinator of combinators)
  {
    if (Array.isArray(openapiSchema[combinator]) === true && Array.isArray(jsonSchema[combinator]) === true)
    {
      const length = Math.min(openapiSchema[combinator].length, jsonSchema[combinator].length);
      for (let index = 0; index < length; index++)
      {
        restoreCustomBounds(openapiSchema[combinator][index], jsonSchema[combinator][index]);
      }
    }
  }
}

// noinspection JSUnusedGlobalSymbols
export const generateSchema = async () =>
{
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

  // We dereference the entire openapi.json file
  const dereferencedOpenApi = await $RefParser.dereference(inputFilePath);

  // We extract the "Manifest" schema
  const manifestOpenApiSchema = dereferencedOpenApi.components.schemas[entity];

  // We convert the OpenAPI schema to JSON schema
  const jsonSchema = toJSONSchema(manifestOpenApiSchema, {
    supportPatternProperties: true
  });

  // Restore overwritten custom numerical bounds (minimum, maximum, etc.)
  restoreCustomBounds(manifestOpenApiSchema, jsonSchema);

  const finalSchema =
    {
      $schema: "http://json-schema.org/draft-04/schema#",
      $id: schemaId,
      title: entity,
      ...jsonSchema
    };

  fs.writeFileSync(outputFilePath, JSON.stringify(finalSchema, null, 2) + '\n');
  console.log(`Successfully generated the JSON Schema for 'Manifest' into file '${outputFilePath}'`);
  return Promise.resolve();
};
