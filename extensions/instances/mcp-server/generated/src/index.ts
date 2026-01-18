#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for picteus-mcp-server v0.6.0
 * Generated on: 2025-12-06T14:03:33.699Z
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";
import { setupWebServer } from "./web-server.js";

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

/**
 * Type definition for JSON objects
 */
type JsonObject = Record<string, any>;

/**
 * Interface for MCP Tool Definition
 */
interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    method: string;
    pathTemplate: string;
    executionParameters: { name: string, in: string }[];
    requestBodyContentType?: string;
    securityRequirements: any[];
}

/**
 * Server configuration
 */
export const SERVER_NAME = "picteus-mcp-server";
export const SERVER_VERSION = "0.6.0";
export const API_BASE_URL = process.env["API_BASE_URL"];

/**
 * MCP Server instance
 */
const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);

/**
 * Map of tool definitions by name
 */
const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

  ["miscellaneous_ping", {
    name: "miscellaneous_ping",
    description: `Enables to check that the service is accessible.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/miscellaneous/ping",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"none":[]}]
  }],
  ["miscellaneous_test", {
    name: "miscellaneous_test",
    description: `This endpoint is for experimentation only.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/miscellaneous/test",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["miscellaneous_installChromeExtension", {
    name: "miscellaneous_installChromeExtension",
    description: `It will only work provided the server is hosted by an Electron application.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"string","description":"The Chrome extension compressed tarball or zip archive"}},"required":["requestBody"]},
    method: "put",
    pathTemplate: "/miscellaneous/installChromeExtension",
    executionParameters: [],
    requestBodyContentType: "application/zip",
    securityRequirements: [{"api-key":[]}]
  }],
  ["administration_migrateDatabase", {
    name: "administration_migrateDatabase",
    description: `Runs the migration scripts on the database.`,
    inputSchema: {"type":"object","properties":{}},
    method: "put",
    pathTemplate: "/administration/migrateDatabase",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["settings_get", {
    name: "settings_get",
    description: `Returns all the application settings.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/settings/get",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["settings_set", {
    name: "settings_set",
    description: `This enables to tune the application settings.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"comfyUiBaseUrl":{"type":"string","description":"The ComfyUI base URL","pattern":"^(https?)://[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|]$"}},"description":"The extension archive"}},"required":["requestBody"]},
    method: "put",
    pathTemplate: "/settings/set",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["apisecret_list", {
    name: "apisecret_list",
    description: `Returns all available API secrets without their values.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/apiSecret/list",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["apisecret_create", {
    name: "apisecret_create",
    description: `Declares a new API secret with the provided metadata.`,
    inputSchema: {"type":"object","properties":{"type":{"type":"string","enum":["key","token"],"description":"The API secret type"},"name":{"minLength":1,"maxLength":128,"type":"string","description":"The API secret name"},"expirationDate":{"minimum":0,"format":"int64","type":"number","description":"The expiration date"},"comment":{"minLength":1,"maxLength":1024,"type":"string","description":"A comment about the API secret"},"scope":{"minLength":1,"maxLength":64,"type":"string","description":"The API secret scope"}},"required":["type","name"]},
    method: "post",
    pathTemplate: "/apiSecret/create",
    executionParameters: [{"name":"type","in":"query"},{"name":"name","in":"query"},{"name":"expirationDate","in":"query"},{"name":"comment","in":"query"},{"name":"scope","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["apisecret_get", {
    name: "apisecret_get",
    description: `Returns the details about an API secret.`,
    inputSchema: {"type":"object","properties":{"id":{"format":"int32","type":"number","description":"The API secret identifier"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/apiSecret/{id}/get",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["apisecret_delete", {
    name: "apisecret_delete",
    description: `Once deleted, it cannot be used anymore.`,
    inputSchema: {"type":"object","properties":{"id":{"format":"int32","type":"number","description":"The API secret identifier"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/apiSecret/{id}/delete",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_getConfiguration", {
    name: "extension_getConfiguration",
    description: `Returns the details in terms of all installed extensions capabilities, i.e. what they can offer, and the command they offer.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/extension/getConfiguration",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_list", {
    name: "extension_list",
    description: `Returns all installed extensions.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/extension/list",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_activities", {
    name: "extension_activities",
    description: `Returns all the installed and active extensions activities.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/extension/activities",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_get", {
    name: "extension_get",
    description: `Returns the details about an extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"}},"required":["id"]},
    method: "get",
    pathTemplate: "/extension/{id}/get",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_install", {
    name: "extension_install",
    description: `Analyzes the extension and installs it.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"string","description":"The extension archive"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/extension/install",
    executionParameters: [],
    requestBodyContentType: "application/zip",
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_update", {
    name: "extension_update",
    description: `Analyzes the extension and updates it.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"requestBody":{"type":"string","description":"The extension archive"}},"required":["id","requestBody"]},
    method: "put",
    pathTemplate: "/extension/{id}/update",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/zip",
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_uninstall", {
    name: "extension_uninstall",
    description: `Stops the extension and uninstalls it.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/extension/{id}/uninstall",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_pauseOrResume", {
    name: "extension_pauseOrResume",
    description: `Either stops and marks it as paused the extension or starts it.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"isPause":{"type":"boolean","description":"Whether the extension should be paused"}},"required":["id","isPause"]},
    method: "put",
    pathTemplate: "/extension/{id}/pauseOrResume",
    executionParameters: [{"name":"id","in":"path"},{"name":"isPause","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_getSettings", {
    name: "extension_getSettings",
    description: `Returns the settings of an extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"}},"required":["id"]},
    method: "get",
    pathTemplate: "/extension/{id}/getSettings",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_setSettings", {
    name: "extension_setSettings",
    description: `Defines the settings of an extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"requestBody":{"type":"object","properties":{"value":{"type":"object","description":"The extension settings"}},"description":"The extension settings","required":["value"]}},"required":["id","requestBody"]},
    method: "put",
    pathTemplate: "/extension/{id}/setSettings",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_synchronize", {
    name: "extension_synchronize",
    description: `Iterates over all images available in the repositories and asks the extension to operate its work if the image is not indexed by it.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"}},"required":["id"]},
    method: "put",
    pathTemplate: "/extension/{id}/synchronize",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_runProcessCommand", {
    name: "extension_runProcessCommand",
    description: `Runs the command defined for the process, by triggering the relevant event to the extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"commandId":{"type":"string","description":"The identifier of the command"},"requestBody":{"type":"object","properties":{},"description":"The command parameters"}},"required":["id","commandId"]},
    method: "put",
    pathTemplate: "/extension/{id}/runProcessCommand",
    executionParameters: [{"name":"id","in":"path"},{"name":"commandId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_runImageCommand", {
    name: "extension_runImageCommand",
    description: `Runs the command defined for images, by triggering the relevant event to the extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"commandId":{"type":"string","description":"The identifier of the command"},"imageIds":{"type":"array","items":{"type":"string"},"description":"The identifiers of the images the command should be run against"},"requestBody":{"type":"object","properties":{},"description":"The command parameters"}},"required":["id","commandId","imageIds"]},
    method: "put",
    pathTemplate: "/extension/{id}/runImageCommand",
    executionParameters: [{"name":"id","in":"path"},{"name":"commandId","in":"query"},{"name":"imageIds","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_generate", {
    name: "extension_generate",
    description: `Scaffolds an extension respecting a set of specifications.`,
    inputSchema: {"type":"object","properties":{"withPublicSdk":{"type":"boolean","description":"Should the extension be dependent on the public extension SDK or the internal private one"},"requestBody":{"type":"object","properties":{"id":{"type":"string","description":"The identifier of the extension","pattern":"^[a-z0-9A-Z-_.]{1,32}$","minLength":1,"maxLength":32},"version":{"type":"string","description":"The version of the extension, which should follow the semver convention","pattern":"^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$","minLength":5,"maxLength":32},"name":{"type":"string","description":"The name of the extension","pattern":"^[a-z0-9A-Z-_. ]{1,128}$","minLength":1,"maxLength":128},"description":{"type":"string","description":"The description of the extension's purpose","minLength":1,"maxLength":1024},"author":{"type":"string","description":"The author of the extension","minLength":1,"maxLength":128},"environment":{"description":"The runtime the extension relies on","allOf":[{"type":"string","enum":["python","node"],"description":"The unique identifier of the runtime environment"}]}},"description":"The extension specifications","required":["id","version","name","description","author","environment"]}},"required":["withPublicSdk","requestBody"]},
    method: "put",
    pathTemplate: "/extension/generate",
    executionParameters: [{"name":"withPublicSdk","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["extension_build", {
    name: "extension_build",
    description: `Compiles and packages an extension from its source code.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"string","description":"The extension archive"}},"required":["requestBody"]},
    method: "put",
    pathTemplate: "/extension/build",
    executionParameters: [],
    requestBodyContentType: "application/zip",
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_list", {
    name: "repository_list",
    description: `Lists all the declared repositories.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/repository/list",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_get", {
    name: "repository_get",
    description: `Returns a single repository.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The repository identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"}},"required":["id"]},
    method: "get",
    pathTemplate: "/repository/{id}/get",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_create", {
    name: "repository_create",
    description: `Declares a new repository.`,
    inputSchema: {"type":"object","properties":{"type":{"enum":["file"],"type":"string","description":"The repository type"},"url":{"type":"string","description":"The repository URL"},"name":{"type":"string","description":"The repository name"},"comment":{"type":"string","description":"The repository comment"},"watch":{"type":"boolean","description":"Whether the repository should be watched immediately ; when not defined, this parameter has the implicit 'false' value"},"technicalId":{"type":"string","description":"The technical identifier"}},"required":["type","url","name"]},
    method: "post",
    pathTemplate: "/repository/create",
    executionParameters: [{"name":"type","in":"query"},{"name":"url","in":"query"},{"name":"name","in":"query"},{"name":"comment","in":"query"},{"name":"watch","in":"query"},{"name":"technicalId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_ensure", {
    name: "repository_ensure",
    description: `Ensures that a repository with type 'file' and with the provided identifier exists, and if not, creates it.`,
    inputSchema: {"type":"object","properties":{"technicalId":{"type":"string","description":"The repository technical identifier"},"name":{"type":"string","description":"The repository name"},"comment":{"type":"string","description":"The repository comment"},"watch":{"type":"boolean","description":"Whether the repository should be watched immediately ; when not defined, this parameter has the implicit 'false' value"}},"required":["technicalId","name"]},
    method: "put",
    pathTemplate: "/repository/ensure",
    executionParameters: [{"name":"technicalId","in":"query"},{"name":"name","in":"query"},{"name":"comment","in":"query"},{"name":"watch","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_startOrStop", {
    name: "repository_startOrStop",
    description: `Starts all the repositories, resume synchronization if necessary and starts watching them, or stops them.`,
    inputSchema: {"type":"object","properties":{"isStart":{"type":"boolean","description":"Whether the repositories should be started or stopped"}},"required":["isStart"]},
    method: "put",
    pathTemplate: "/repository/startOrStop",
    executionParameters: [{"name":"isStart","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_synchronize", {
    name: "repository_synchronize",
    description: `Synchronizes a repository against its back-end.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The repository identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "put",
    pathTemplate: "/repository/{id}/synchronize",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_watch", {
    name: "repository_watch",
    description: `Starts or stops listening to the repository back-end images changes.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The repository identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"isStart":{"type":"boolean","description":"Whether the repository should start or stop watching"}},"required":["id","isStart"]},
    method: "put",
    pathTemplate: "/repository/{id}/watch",
    executionParameters: [{"name":"id","in":"path"},{"name":"isStart","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_delete", {
    name: "repository_delete",
    description: `Deletes a repository along with all the images attached to it.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The repository identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "delete",
    pathTemplate: "/repository/{id}/delete",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_activities", {
    name: "repository_activities",
    description: `Returns all the declared repositories activities.`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/repository/activities",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_searchImages", {
    name: "repository_searchImages",
    description: `Searches images within the repository with the provided criteria.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The repository identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"criteria":{"type":"object","properties":{"formats":{"type":"array","description":"A filter used by the search which will limit the result entities to those having one of the provided image formats","default":["PNG","JPEG","WEBP","GIF","AVIF","HEIF"],"items":{"type":"string","enum":["PNG","JPEG","WEBP","GIF","AVIF","HEIF"],"description":"A filter used by the search which will limit the result entities to those having one of the provided image formats"}},"keyword":{"description":"A filter which limits the result entities with the provided text specifications","allOf":[{"type":"object","properties":{"text":{"type":"string","description":"The text to search for","example":"comfy"},"inName":{"type":"boolean","description":"Whether the text should be searched in the image name"},"inMetadata":{"type":"boolean","description":"Whether the text should be searched in the image metadata"},"inFeatures":{"type":"boolean","description":"Whether the text should be searched in the image features"}},"description":"The textual specifications to match when searching for images","required":["text","inName","inMetadata","inFeatures"]}]},"tags":{"description":"A filter which limits the result entities with the provided tags specifications","allOf":[{"type":"object","properties":{"values":{"description":"The tags to search for","example":["nature"],"type":"array","items":{"type":"string"}}},"description":"The matching values of tags to match when searching for images","required":["values"]}]},"properties":{"description":"A filter which limits the result entities with the provided technical properties","allOf":[{"type":"object","properties":{"width":{"description":"The range of the image width","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"height":{"description":"The range of the image height","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"weightInBytes":{"description":"The range of the image binary weight","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"creationDate":{"description":"The range of the image creation dates, expressed in milliseconds from 1970, January 1st","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"modificationDate":{"description":"The range of the image modification dates, expressed in milliseconds from 1970, January 1st","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]}},"description":"Technical properties to match when searching for images"}]},"generator":{"description":"A filter used by the search which will limit the result entities to the provided generator used to produce the image","allOf":[{"type":"string","enum":["comfyui","automatic1111","midjourney"],"description":"A filter used by the search which will limit the result entities to the provided generator used to produce the image"}]}},"description":"The criteria that will be applied to the search as a filter"},"sorting":{"type":"object","properties":{"property":{"description":"Indicates how the search result entities should be sorted","default":"name","allOf":[{"type":"string","enum":["name","creationDate","modificationDate","binarySize","width","height"],"description":"Indicates how the search result entities should be sorted"}]},"isAscending":{"type":"boolean","description":"Whether the returned entities should be sorted in ascending or descending order in respect of the property"}},"description":"Indicates how the search results should be sorted","required":["property"]},"range":{"type":"object","properties":{"take":{"type":"number","description":"The number of items to return","format":"int64","minimum":1,"maximum":1000,"default":20},"skip":{"type":"number","description":"The number of items to skip","format":"int64","minimum":0,"default":0}},"description":"The range of items to consider following the search"}},"required":["id"]},
    method: "get",
    pathTemplate: "/repository/{id}/searchImages",
    executionParameters: [{"name":"id","in":"path"},{"name":"criteria","in":"query"},{"name":"sorting","in":"query"},{"name":"range","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_getImageByUrl", {
    name: "repository_getImageByUrl",
    description: `Returns the details about an image.`,
    inputSchema: {"type":"object","properties":{"url":{"description":"The image URL","type":"string","format":"uri","pattern":"file://.*","minLength":8,"maxLength":1024}},"required":["url"]},
    method: "get",
    pathTemplate: "/repository/getImageByUrl",
    executionParameters: [{"name":"url","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_renameImage", {
    name: "repository_renameImage",
    description: `Renames the file of an image in a repository.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The repository identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"imageId":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"nameWithoutExtension":{"pattern":"^[^<>:,?\"*|/\\]+$","type":"string","description":"The new file name without the file extension"},"relativeDirectoryPath":{"pattern":"^[^<>:,?\"*|]+$","type":"string","description":"The relative directory path within the repository that will host the image"}},"required":["id","imageId","nameWithoutExtension"]},
    method: "put",
    pathTemplate: "/repository/{id}/renameImage",
    executionParameters: [{"name":"id","in":"path"},{"name":"imageId","in":"query"},{"name":"nameWithoutExtension","in":"query"},{"name":"relativeDirectoryPath","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["repository_storeImage", {
    name: "repository_storeImage",
    description: `Declares an image in the repository and returns it.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The repository identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"sourceUrl":{"type":"string","format":"uri","minimum":8,"maxLength":1024,"description":"The URL of the image source"},"parentId":{"description":"The identifier of the image parent image","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"applicationMetadata":{"type":"string","description":"The JSON string representing the application metadata"},"relativeDirectoryPath":{"pattern":"^[^<>:,?\"*|]+$","type":"string","description":"The relative directory path within the repository that will host the image"},"nameWithoutExtension":{"pattern":"^[^<>:,?\"*|/\\]+$","type":"string","description":"The image file name, without its extension"},"requestBody":{"type":"string","description":"The image file"}},"required":["id","requestBody"]},
    method: "post",
    pathTemplate: "/repository/{id}/storeImage",
    executionParameters: [{"name":"id","in":"path"},{"name":"sourceUrl","in":"query"},{"name":"parentId","in":"query"},{"name":"applicationMetadata","in":"query"},{"name":"relativeDirectoryPath","in":"query"},{"name":"nameWithoutExtension","in":"query"}],
    requestBodyContentType: "image/png",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_search", {
    name: "image_search",
    description: `Searches images, given criteria.`,
    inputSchema: {"type":"object","properties":{"criteria":{"type":"object","properties":{"formats":{"type":"array","description":"A filter used by the search which will limit the result entities to those having one of the provided image formats","default":["PNG","JPEG","WEBP","GIF","AVIF","HEIF"],"items":{"type":"string","enum":["PNG","JPEG","WEBP","GIF","AVIF","HEIF"],"description":"A filter used by the search which will limit the result entities to those having one of the provided image formats"}},"keyword":{"description":"A filter which limits the result entities with the provided text specifications","allOf":[{"type":"object","properties":{"text":{"type":"string","description":"The text to search for","example":"comfy"},"inName":{"type":"boolean","description":"Whether the text should be searched in the image name"},"inMetadata":{"type":"boolean","description":"Whether the text should be searched in the image metadata"},"inFeatures":{"type":"boolean","description":"Whether the text should be searched in the image features"}},"description":"The textual specifications to match when searching for images","required":["text","inName","inMetadata","inFeatures"]}]},"tags":{"description":"A filter which limits the result entities with the provided tags specifications","allOf":[{"type":"object","properties":{"values":{"description":"The tags to search for","example":["nature"],"type":"array","items":{"type":"string"}}},"description":"The matching values of tags to match when searching for images","required":["values"]}]},"properties":{"description":"A filter which limits the result entities with the provided technical properties","allOf":[{"type":"object","properties":{"width":{"description":"The range of the image width","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"height":{"description":"The range of the image height","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"weightInBytes":{"description":"The range of the image binary weight","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"creationDate":{"description":"The range of the image creation dates, expressed in milliseconds from 1970, January 1st","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]},"modificationDate":{"description":"The range of the image modification dates, expressed in milliseconds from 1970, January 1st","allOf":[{"type":"object","properties":{"minimum":{"type":"number","description":"The minimal value","format":"int64","minimum":0,"example":0},"maximum":{"type":"number","description":"The maximal value","format":"int64","example":100}},"description":"The minimal and maximal value of a technical property when searching for images"}]}},"description":"Technical properties to match when searching for images"}]},"generator":{"description":"A filter used by the search which will limit the result entities to the provided generator used to produce the image","allOf":[{"type":"string","enum":["comfyui","automatic1111","midjourney"],"description":"A filter used by the search which will limit the result entities to the provided generator used to produce the image"}]}},"description":"The criteria that will be applied to the search as a filter"},"sorting":{"type":"object","properties":{"property":{"description":"Indicates how the search result entities should be sorted","default":"name","allOf":[{"type":"string","enum":["name","creationDate","modificationDate","binarySize","width","height"],"description":"Indicates how the search result entities should be sorted"}]},"isAscending":{"type":"boolean","description":"Whether the returned entities should be sorted in ascending or descending order in respect of the property"}},"description":"Indicates how the search results should be sorted","required":["property"]},"range":{"type":"object","properties":{"take":{"type":"number","description":"The number of items to return","format":"int64","minimum":1,"maximum":1000,"default":20},"skip":{"type":"number","description":"The number of items to skip","format":"int64","minimum":0,"default":0}},"description":"The range of items to consider following the search"},"ids":{"type":"array","items":{"type":"string"},"description":"The repository identifiers the images should belong to"}}},
    method: "get",
    pathTemplate: "/image/search",
    executionParameters: [{"name":"criteria","in":"query"},{"name":"sorting","in":"query"},{"name":"range","in":"query"},{"name":"ids","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_get", {
    name: "image_get",
    description: `Returns the details about an image.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/get",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_modify", {
    name: "image_modify",
    description: `Updates the content of an image via a file.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"requestBody":{"type":"string","description":"The image file"}},"required":["id","requestBody"]},
    method: "put",
    pathTemplate: "/image/{id}/modify",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "image/png",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_download", {
    name: "image_download",
    description: `Returns the binary form of an image.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"format":{"type":"string","enum":["PNG","JPEG","WEBP","GIF","AVIF","HEIF"],"description":"The image format"},"width":{"format":"int32","type":"number","description":"The image maximum width ; if not defined, the original width is used"},"height":{"format":"int32","type":"number","description":"The image maximum height ; if not defined, the original height is used"},"resizeRender":{"type":"string","enum":["inbox","outbox"],"description":"The way the image should be resized"},"stripMetadata":{"type":"boolean","description":"Whether the image metadata should be stripped"}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/download",
    executionParameters: [{"name":"id","in":"path"},{"name":"format","in":"query"},{"name":"width","in":"query"},{"name":"height","in":"query"},{"name":"resizeRender","in":"query"},{"name":"stripMetadata","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_mediaUrl", {
    name: "image_mediaUrl",
    description: `Returns the URL of the image, given for some given dimensions and format, which may used to display it.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"format":{"type":"string","enum":["PNG","JPEG","WEBP","GIF","AVIF","HEIF"],"description":"The image format"},"width":{"format":"int32","type":"number","description":"The image maximum width ; if not defined, the original width is used"},"height":{"format":"int32","type":"number","description":"The image maximum height ; if not defined, the original height is used"},"resizeRender":{"type":"string","enum":["inbox","outbox"],"description":"The way the image should be resized"}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/mediaUrl",
    executionParameters: [{"name":"id","in":"path"},{"name":"format","in":"query"},{"name":"width","in":"query"},{"name":"height","in":"query"},{"name":"resizeRender","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getMetadata", {
    name: "image_getMetadata",
    description: `Returns all the metadata of an image available in its representation file.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/metadata",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getAllFeatures", {
    name: "image_getAllFeatures",
    description: `Returns the features of an image for all extensions.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/getAllFeatures",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_setFeatures", {
    name: "image_setFeatures",
    description: `Stores the provided features of an image for a given extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"requestBody":{"type":"array","items":{"type":"object","properties":{"type":{"description":"The image feature type","allOf":[{"type":"string","description":"All the possible types for an image feature.","default":"other","enum":["caption","description","comment","metadata","recipe","other"]}]},"format":{"description":"The image feature format","allOf":[{"type":"string","description":"All the possible formats for an image feature.","default":"string","enum":["string","json","xml","markdown","html","binary"]}]},"name":{"type":"string","description":"The image feature name","minLength":1,"maxLength":64},"value":{"type":"string","description":"The image feature value","minLength":1,"maxLength":524288}},"description":"The image features","required":["type","format","value"]},"minItems":0,"maxItems":32,"description":"The image features"}},"required":["id","extensionId","requestBody"]},
    method: "put",
    pathTemplate: "/image/{id}/setFeatures",
    executionParameters: [{"name":"id","in":"path"},{"name":"extensionId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getAllTags", {
    name: "image_getAllTags",
    description: `Returns the tags of an image for all extensions.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/getAllTags",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_setTags", {
    name: "image_setTags",
    description: `Sets the tags of an image for a given extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"requestBody":{"type":"array","items":{"type":"string","pattern":"a-z0-9A-Z-_.","minLength":1,"maxLength":64},"minItems":0,"maxItems":256,"description":"The image tags"}},"required":["id","extensionId","requestBody"]},
    method: "put",
    pathTemplate: "/image/{id}/setTags",
    executionParameters: [{"name":"id","in":"path"},{"name":"extensionId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_ensureTags", {
    name: "image_ensureTags",
    description: `Ensures that some tags are set on an image for a given extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"requestBody":{"type":"array","items":{"type":"string","pattern":"a-z0-9A-Z-_.","minLength":1,"maxLength":64},"minItems":1,"maxItems":256,"description":"The image tags"}},"required":["id","extensionId","requestBody"]},
    method: "put",
    pathTemplate: "/image/{id}/ensureTags",
    executionParameters: [{"name":"id","in":"path"},{"name":"extensionId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getAllEmbeddings", {
    name: "image_getAllEmbeddings",
    description: `Returns the computed embeddings of an image for all extensions.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/getAllEmbeddings",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getEmbeddings", {
    name: "image_getEmbeddings",
    description: `Returns the computed embeddings of an image for a given extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"}},"required":["id","extensionId"]},
    method: "get",
    pathTemplate: "/image/{id}/getEmbeddings",
    executionParameters: [{"name":"id","in":"path"},{"name":"extensionId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_setEmbeddings", {
    name: "image_setEmbeddings",
    description: `Sets the computed embeddings of an image for a given extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"requestBody":{"type":"object","properties":{"values":{"description":"The image embeddings vector","minItems":1,"maxItems":4096,"type":"array","items":{"type":"number","format":"double"}}},"description":"The image embeddings","required":["values"]}},"required":["id","extensionId","requestBody"]},
    method: "put",
    pathTemplate: "/image/{id}/setEmbeddings",
    executionParameters: [{"name":"id","in":"path"},{"name":"extensionId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_closestImages", {
    name: "image_closestImages",
    description: `Returns the closest images for a given an image, following the embeddings of a given extension.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"count":{"format":"int64","type":"number","description":"The number of images to return"}},"required":["id","extensionId","count"]},
    method: "get",
    pathTemplate: "/image/{id}/closestImages",
    executionParameters: [{"name":"id","in":"path"},{"name":"extensionId","in":"query"},{"name":"count","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_closestEmbeddingsImages", {
    name: "image_closestEmbeddingsImages",
    description: `Returns the closest images given some embeddings and for a given extension.`,
    inputSchema: {"type":"object","properties":{"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"count":{"type":"number","description":"The number of images to return"},"requestBody":{"type":"object","properties":{"values":{"description":"The image embeddings vector","minItems":1,"maxItems":4096,"type":"array","items":{"type":"number","format":"double"}}},"description":"The image embeddings","required":["values"]}},"required":["extensionId","count","requestBody"]},
    method: "put",
    pathTemplate: "/image/closestEmbeddingsImages",
    executionParameters: [{"name":"extensionId","in":"query"},{"name":"count","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_textToImages", {
    name: "image_textToImages",
    description: `Returns the closest images for a given text which will be turned into embeddings, following the embeddings of a given extension.`,
    inputSchema: {"type":"object","properties":{"text":{"type":"string","description":"The text"},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"count":{"type":"number","description":"The number of images to return"}},"required":["text","extensionId","count"]},
    method: "get",
    pathTemplate: "/image/textToImages",
    executionParameters: [{"name":"text","in":"query"},{"name":"extensionId","in":"query"},{"name":"count","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getComfyUi", {
    name: "image_getComfyUi",
    description: `Returns the ComfyUI prompt and workflow entities available in the image metadata.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/getComfyUi",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getAutomatic1111", {
    name: "image_getAutomatic1111",
    description: `Returns the Automatic1111 generation instructions available in the image metadata.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/getAutomatic1111",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_getMidjourney", {
    name: "image_getMidjourney",
    description: `Returns the Midjourney generation instructions available in the image metadata.`,
    inputSchema: {"type":"object","properties":{"id":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36}},"required":["id"]},
    method: "get",
    pathTemplate: "/image/{id}/getMidjourney",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_computeFormat", {
    name: "image_computeFormat",
    description: `Analyzes the provided image, computes its format and returns it.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"string","description":"The image file"}},"required":["requestBody"]},
    method: "put",
    pathTemplate: "/image/format",
    executionParameters: [],
    requestBodyContentType: "image/png",
    securityRequirements: [{"api-key":[]}]
  }],
  ["image_convert", {
    name: "image_convert",
    description: `Converts the provided image into the requested format and returns it.`,
    inputSchema: {"type":"object","properties":{"format":{"type":"string","enum":["PNG","JPEG","WEBP","GIF","AVIF","HEIF"],"description":"The image format"},"quality":{"minimum":1,"maximum":100,"format":"int32","type":"number","description":"The image quality, in case of a lossy format like JPEG or WEBP"},"requestBody":{"type":"string","description":"The image file"}},"required":["format","requestBody"]},
    method: "put",
    pathTemplate: "/image/convert",
    executionParameters: [{"name":"format","in":"query"},{"name":"quality","in":"query"}],
    requestBodyContentType: "image/png",
    securityRequirements: [{"api-key":[]}]
  }],
  ["imageattachment_create", {
    name: "imageattachment_create",
    description: `Stores a binary attachment related to an image for a given extension.`,
    inputSchema: {"type":"object","properties":{"imageId":{"description":"The image identifier","type":"string","pattern":"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}","minLength":36,"maxLength":36},"extensionId":{"description":"The extension identifier","type":"string","pattern":"^[a-z0-9A-Z-_.]{1,32}$"},"mimeType":{"minLength":1,"maxLength":32,"type":"string","description":"The MIME type of the attachment payload"},"requestBody":{"type":"string","description":"The attachment payload"}},"required":["imageId","extensionId","mimeType","requestBody"]},
    method: "post",
    pathTemplate: "/imageAttachment/create",
    executionParameters: [{"name":"imageId","in":"query"},{"name":"extensionId","in":"query"},{"name":"mimeType","in":"query"}],
    requestBodyContentType: "image/png",
    securityRequirements: [{"api-key":[]}]
  }],
  ["imageattachment_download", {
    name: "imageattachment_download",
    description: `Retrieves the payload of a binary attachment related to an image for a given extension.`,
    inputSchema: {"type":"object","properties":{"uri":{"description":"The attachment URI","type":"string","format":"uri","pattern":"^(attachment://[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|]","minLength":8,"maxLength":1024}},"required":["uri"]},
    method: "get",
    pathTemplate: "/imageAttachment/{uri}/download",
    executionParameters: [{"name":"uri","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"api-key":[]}]
  }],
]);

/**
 * Security schemes from the OpenAPI spec
 */
const securitySchemes =   {
    "api-key": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-KEY",
      "description": "Forces the caller to be authenticated."
    }
  };


server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema
  }));
  return { tools: toolsForClient };
});


server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = toolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(`Error: Unknown tool requested: ${toolName}`);
    return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
  }
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});



/**
 * Type definition for cached OAuth tokens
 */
interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

/**
 * Declare global __oauthTokenCache property for TypeScript
 */
declare global {
    var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}

/**
 * Acquires an OAuth2 token using client credentials flow
 *
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
    try {
        // Check if we have the necessary credentials
        const clientId = process.env[`OAUTH_CLIENT_ID_SCHEMENAME`];
        const clientSecret = process.env[`OAUTH_CLIENT_SECRET_SCHEMENAME`];
        const scopes = process.env[`OAUTH_SCOPES_SCHEMENAME`];

        if (!clientId || !clientSecret) {
            console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
            return null;
        }

        // Initialize token cache if needed
        if (typeof global.__oauthTokenCache === 'undefined') {
            global.__oauthTokenCache = {};
        }

        // Check if we have a cached token
        const cacheKey = `${schemeName}_${clientId}`;
        const cachedToken = global.__oauthTokenCache[cacheKey];
        const now = Date.now();

        if (cachedToken && cachedToken.expiresAt > now) {
            console.error(`Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
            return cachedToken.token;
        }

        // Determine token URL based on flow type
        let tokenUrl = '';
        if (scheme.flows?.clientCredentials?.tokenUrl) {
            tokenUrl = scheme.flows.clientCredentials.tokenUrl;
            console.error(`Using client credentials flow for '${schemeName}'`);
        } else if (scheme.flows?.password?.tokenUrl) {
            tokenUrl = scheme.flows.password.tokenUrl;
            console.error(`Using password flow for '${schemeName}'`);
        } else {
            console.error(`No supported OAuth2 flow found for '${schemeName}'`);
            return null;
        }

        // Prepare the token request
        let formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');

        // Add scopes if specified
        if (scopes) {
            formData.append('scope', scopes);
        }

        console.error(`Requesting OAuth2 token from ${tokenUrl}`);

        // Make the token request
        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            data: formData.toString()
        });

        // Process the response
        if (response.data?.access_token) {
            const token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600; // Default to 1 hour

            // Cache the token
            global.__oauthTokenCache[cacheKey] = {
                token,
                expiresAt: now + (expiresIn * 1000) - 60000 // Expire 1 minute early
            };

            console.error(`Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`);
            return token;
        } else {
            console.error(`Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
        return null;
    }
}


/**
 * Executes an API tool with the provided arguments
 *
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @param allSecuritySchemes Security schemes from the OpenAPI spec
 * @returns Call tool result
 */
async function executeApiTool(
    toolName: string,
    definition: McpToolDefinition,
    toolArgs: JsonObject,
    allSecuritySchemes: Record<string, any>
): Promise<CallToolResult> {
  try {
    // Validate arguments against the input schema
    let validatedArgs: JsonObject;
    try {
        const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
        const argsToParse = (typeof toolArgs === 'object' && toolArgs !== null) ? toolArgs : {};
        validatedArgs = zodSchema.parse(argsToParse);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join(', ')}`;
            return { content: [{ type: 'text', text: validationErrorMessage }] };
        } else {
             const errorMessage = error instanceof Error ? error.message : String(error);
             return { content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }] };
        }
    }

    // Prepare URL, query parameters, headers, and request body
    let urlPath = definition.pathTemplate;
    const queryParams: Record<string, any> = {};
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let requestBodyData: any = undefined;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
        const value = validatedArgs[param.name];
        if (typeof value !== 'undefined' && value !== null) {
            if (param.in === 'path') {
                urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
            }
            else if (param.in === 'query') {
                queryParams[param.name] = value;
            }
            else if (param.in === 'header') {
                headers[param.name.toLowerCase()] = String(value);
            }
        }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes('{')) {
        throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }

    // Construct the full URL
    const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

    // Handle request body if needed
    if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
        requestBodyData = validatedArgs['requestBody'];
        headers['content-type'] = definition.requestBodyContentType;
    }


    // Apply security requirements if available
    // Security requirements use OR between array items and AND within each object
    const appliedSecurity = definition.securityRequirements?.find(req => {
        // Try each security requirement (combined with OR)
        return Object.entries(req).every(([schemeName, scopesArray]) => {
            const scheme = allSecuritySchemes[schemeName];
            if (!scheme) return false;

            // API Key security (header, query, cookie)
            if (scheme.type === 'apiKey') {
                return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }

            // HTTP security (basic, bearer)
            if (scheme.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    return !!process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    return !!process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                           !!process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
            }

            // OAuth2 security
            if (scheme.type === 'oauth2') {
                // Check for pre-existing token
                if (process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    return true;
                }

                // Check for client credentials for auto-acquisition
                if (process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                    process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    // Verify we have a supported flow
                    if (scheme.flows?.clientCredentials || scheme.flows?.password) {
                        return true;
                    }
                }

                return false;
            }

            // OpenID Connect
            if (scheme.type === 'openIdConnect') {
                return !!process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }

            return false;
        });
    });

    // If we found matching security scheme(s), apply them
    if (appliedSecurity) {
        // Apply each security scheme from this requirement (combined with AND)
        for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
            const scheme = allSecuritySchemes[schemeName];

            // API Key security
            if (scheme?.type === 'apiKey') {
                const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (apiKey) {
                    if (scheme.in === 'header') {
                        headers[scheme.name.toLowerCase()] = apiKey;
                        console.error(`Applied API key '${schemeName}' in header '${scheme.name}'`);
                    }
                    else if (scheme.in === 'query') {
                        queryParams[scheme.name] = apiKey;
                        console.error(`Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
                    }
                    else if (scheme.in === 'cookie') {
                        // Add the cookie, preserving other cookies if they exist
                        headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
                        console.error(`Applied API key '${schemeName}' in cookie '${scheme.name}'`);
                    }
                }
            }
            // HTTP security (Bearer or Basic)
            else if (scheme?.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (token) {
                        headers['authorization'] = `Bearer ${token}`;
                        console.error(`Applied Bearer token for '${schemeName}'`);
                    }
                }
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (username && password) {
                        headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
                        console.error(`Applied Basic authentication for '${schemeName}'`);
                    }
                }
            }
            // OAuth2 security
            else if (scheme?.type === 'oauth2') {
                // First try to use a pre-provided token
                let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];

                // If no token but we have client credentials, try to acquire a token
                if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
                    console.error(`Attempting to acquire OAuth token for '${schemeName}'`);
                    token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
                }

                // Apply token if available
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OAuth2 token for '${schemeName}'`);

                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
            // OpenID Connect
            else if (scheme?.type === 'openIdConnect') {
                const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OpenID Connect token for '${schemeName}'`);

                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
        }
    }
    // Log warning if security is required but not available
    else if (definition.securityRequirements?.length > 0) {
        // First generate a more readable representation of the security requirements
        const securityRequirementsString = definition.securityRequirements
            .map(req => {
                const parts = Object.entries(req)
                    .map(([name, scopesArray]) => {
                        const scopes = scopesArray as string[];
                        if (scopes.length === 0) return name;
                        return `${name} (scopes: ${scopes.join(', ')})`;
                    })
                    .join(' AND ');
                return `[${parts}]`;
            })
            .join(' OR ');

        console.warn(`Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
    }


    // Prepare the axios request configuration
    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(),
      url: requestUrl,
      params: queryParams,
      headers: headers,
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${config.method} ${config.url}`);

    // Execute the request
    const response = await axios(config);

    // Process and format the response
    let responseText = '';
    const contentType = response.headers['content-type']?.toLowerCase() || '';

    // Handle JSON responses
    if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
         try {
             responseText = JSON.stringify(response.data, null, 2);
         } catch (e) {
             responseText = "[Stringify Error]";
         }
    }
    // Handle string responses
    else if (typeof response.data === 'string') {
         responseText = response.data;
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) {
         responseText = String(response.data);
    }
    // Handle empty responses
    else {
         responseText = `(Status: ${response.status} - No body content)`;
    }

    // Return formatted response
    return {
        content: [
            {
                type: "text",
                text: `API Response (Status: ${response.status}):\n${responseText}`
            }
        ],
    };

  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;

    // Format Axios errors specially
    if (axios.isAxiosError(error)) {
        errorMessage = formatApiError(error);
    }
    // Handle standard errors
    else if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Handle unexpected error types
    else {
        errorMessage = 'Unexpected error: ' + String(error);
    }

    // Log error to stderr
    console.error(`Error during execution of tool '${toolName}':`, errorMessage);

    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}


/**
 * Main function to start the server
 */
export async function main() {
// Set up Web Server transport

  try {
    await setupWebServer(server, process.env["PORT"] === undefined ? undefined : parseInt(process.env["PORT"], 10));
    return ()=>{ server.close(); };
  } catch (error) {
    console.error("Error setting up web server:", error);
    process.exit(1);
  }
}

/**
 * Formats API errors for better readability
 *
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
    let message = 'API request failed.';
    if (error.response) {
        message = `API Error: Status ${error.response.status} (${error.response.statusText || 'Status text not available'}). `;
        const responseData = error.response.data;
        const MAX_LEN = 200;
        if (typeof responseData === 'string') {
            message += `Response: ${responseData.substring(0, MAX_LEN)}${responseData.length > MAX_LEN ? '...' : ''}`;
        }
        else if (responseData) {
            try {
                const jsonString = JSON.stringify(responseData);
                message += `Response: ${jsonString.substring(0, MAX_LEN)}${jsonString.length > MAX_LEN ? '...' : ''}`;
            } catch {
                message += 'Response: [Could not serialize data]';
            }
        }
        else {
            message += 'No response body received.';
        }
    } else if (error.request) {
        message = 'API Network Error: No response received from server.';
        if (error.code) message += ` (Code: ${error.code})`;
    } else {
        message += `API Request Setup Error: ${error.message}`;
    }
    return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 *
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) {
        return z.object({}).passthrough();
    }
    try {
        const zodSchemaString = jsonSchemaToZod(jsonSchema);
        const zodSchema = eval(zodSchemaString);
        if (typeof zodSchema?.parse !== 'function') {
            throw new Error('Eval did not produce a valid Zod schema.');
        }
        return zodSchema as z.ZodTypeAny;
    } catch (err: any) {
        console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
        return z.object({}).passthrough();
    }
}
