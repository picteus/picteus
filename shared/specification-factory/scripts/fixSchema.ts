import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


interface JsonSchemaDefinition
{
  $schema?: string;
  $id?: string;
  $ref?: string;
  $defs?: Record<string, JsonSchemaDefinition>;
  [ key: string ]: unknown;
}

interface JsonSchemaDocument
{
  $schema?: string;
  $id?: string;
  $defs?: Record<string, JsonSchemaDefinition>;
  [ key: string ]: unknown;
}

// We recursively update file-based schema references (e.g. "UiContainer.json" to "#/$defs/UiContainer")
function updateReferences(node: unknown): void
{
  if (!node || typeof node !== "object")
  {
    return;
  }

  const recordNode = node as Record<string, unknown>;
  if (typeof recordNode.$ref === "string")
  {
    const jsonFileMatch = /^([A-Za-z0-9_-]+)\.json$/.exec(recordNode.$ref);
    if (jsonFileMatch)
    {
      recordNode.$ref = `#/$defs/${jsonFileMatch[1]}`;
    }
  }

  for (const childNode of Object.values(recordNode))
  {
    updateReferences(childNode);
  }
}

// We determine the file paths
const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const schemaFilePath = path.resolve(process.argv[2]);

// We check if the schema file exists before proceeding
if (!fs.existsSync(schemaFilePath))
{
  console.warn(`[fixSchema] Could not fin the schema file '${schemaFilePath}'`);
  process.exit(1);
}

// We parse the generated schema
const schemaContent = fs.readFileSync(schemaFilePath, "utf8");
const schemaDocument = JSON.parse(schemaContent) as JsonSchemaDocument;

if (schemaDocument.$defs && typeof schemaDocument.$defs === "object")
{
  const hoistedDefinitions: Record<string, JsonSchemaDefinition> = {};
  const processingQueue: [ string, JsonSchemaDefinition ][] = [ ...Object.entries(schemaDocument.$defs) ];

  // We recursively collect nested $defs into the top-level definitions object
  while (processingQueue.length > 0)
  {
    const entry = processingQueue.shift();
    if (!entry)
    {
      continue;
    }

    const [ definitionKey, definitionValue ] = entry;
    if (definitionValue && typeof definitionValue === "object")
    {
      if (definitionValue.$defs && typeof definitionValue.$defs === "object")
      {
        for (const [ nestedKey, nestedValue ] of Object.entries(definitionValue.$defs))
        {
          if (!hoistedDefinitions[nestedKey])
          {
            processingQueue.push([ nestedKey, nestedValue ]);
          }
        }
        delete definitionValue.$defs;
      }
      delete definitionValue.$schema;
      delete definitionValue.$id;
    }
    hoistedDefinitions[definitionKey] = definitionValue;
  }

  updateReferences(hoistedDefinitions);
  schemaDocument.$defs = hoistedDefinitions;

  // We write the fixed schema with 4-space indentation matching TypeSpec formatting
  fs.writeFileSync(schemaFilePath, `${JSON.stringify(schemaDocument, null, 4)}\n`, "utf8");

  // We also keep the project root schema file updated if it exists
  const rootSchemaFilePath = path.resolve(currentDirectoryPath, `../${schemaFilePath}`);
  if (fs.existsSync(rootSchemaFilePath))
  {
    fs.writeFileSync(rootSchemaFilePath, `${JSON.stringify(schemaDocument, null, 4)}\n`, "utf8");
  }

  console.log(`[fixSchema] Successfully fixed the JSON schema definitions in file '${schemaFilePath}'`);
}
