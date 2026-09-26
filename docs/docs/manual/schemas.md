# Schemas

Important Picteus concepts are captured through formal contracts embodied in schemas. These schemas define the shape,
required properties, allowed values, and relationships of data exchanged between the application, extensions, external
services, and users. They support normalization by giving different components a shared vocabulary and a predictable
representation of the same entities.

Schemas also make integrations easier to validate and maintain. An extension, client, or external tool can inspect the
contract before sending data, while Picteus can reject incomplete or inconsistent data at its boundaries. The source
files are maintained in the Picteus repository, and the public JSON schemas are published with the documentation site.

When a JSON document's contract supports it, include a `$schema` property that points to the corresponding published
JSON Schema file. This lets capable editors and coding agents associate the document with its contract and provide
validation, completion guidance, and any examples or snippets exposed by the schema.

## Web services OpenAPI specification

The back-end web services are described by an OpenAPI 3.1 specification. It defines the available paths and operations,
parameters, request and response bodies, security requirements, status codes, and reusable data schemas. It is the
contract used to document the REST API and generate typed clients.

- [GitHub source: `back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json);
- [Raw OpenAPI JSON](https://raw.githubusercontent.com/picteus/picteus/main/back-end/openapi.json);
- [Web services API overview](webservicesapi/index.md).

The OpenAPI specification is not served under the `/jsonschema` path because it describes the complete HTTP API rather
than one standalone JSON document type.

## Extension manifest schema

The manifest schema validates an extension's `manifest.json` file. It defines the extension identity, runtime
requirements, event instructions, capabilities, commands, settings, user-interface declarations, and other contracts
with Picteus.

The current extension manifest contract is version 3:

- [GitHub source:
  `manifest-v3.schema.json`](https://github.com/picteus/picteus/blob/main/docs/static/jsonschema/manifest-v3.schema.json);
- [Published manifest schema](https://picteus.github.io/picteus/jsonschema/manifest-v3.schema.json);
- [Manifest reference](../extensions/reference/manifest.md).

Add this top-level property to a manifest to enable schema-aware editor support. The snippet shows the property only,
not a complete manifest:

```json
{
  "$schema": "https://picteus.github.io/picteus/jsonschema/manifest-v3.schema.json"
}
```

Previous manifest schema versions remain available for compatibility:

- [Manifest version 1 on GitHub](https://github.com/picteus/picteus/blob/main/docs/static/jsonschema/manifest-v1.schema.json) — [published schema](https://picteus.github.io/picteus/jsonschema/manifest-v1.schema.json);
- [Manifest version 2 on GitHub](https://github.com/picteus/picteus/blob/main/docs/static/jsonschema/manifest-v2.schema.json) — [published schema](https://picteus.github.io/picteus/jsonschema/manifest-v2.schema.json).

## Generation recipe schema

The generation recipe schema defines the structured value of a `recipe` image feature. It captures the generation schema
version, model tags, prompt or structured instructions, generating software, input assets, and other optional provenance
information.

The current recipe schema version is 2:

- [Recipe version 2 on GitHub](https://github.com/picteus/picteus/blob/main/docs/static/jsonschema/recipe-v2.schema.json) — [published schema](https://picteus.github.io/picteus/jsonschema/recipe-v2.schema.json).

Add this top-level property to a recipe value to enable schema-aware editor support, but this is not required nor
advised to include that property when submitting a recipe via API, it is only helpful at discovering and understanding
the grammar. The snippet shows the property only, not a complete recipe:

```json
{
  "$schema": "https://picteus.github.io/picteus/jsonschema/recipe-v2.schema.json"
}
```

The recipe value is validated when it is submitted through the feature write services.
See [Generation recipes](recipe.md) for the role, fields, prompt forms, and provenance use cases.

## ViewKit schema

The ViewKit schema defines declarative user-interface structures used to render feature values in the Picteus front-end.
It provides a normalized representation for groups, layouts, visual elements, and the values or controls presented
around an image feature.

The ViewKit schema version is 2:

- [ViewKit version 2 on GitHub](https://github.com/picteus/picteus/blob/main/docs/static/jsonschema/viewkit-v2.schema.json) — [published schema](https://picteus.github.io/picteus/jsonschema/viewkit-v2.schema.json).

See the [ViewKit reference](../extensions/reference/viewkit.md) for the visual grammar and extension usage.
