# Image generation recipes

An image generation recipe is a specialized image feature that records the instructions and context used to create an
AI-generated image. The shared `GenerationRecipe` schema gives extensions a common structure for capturing generation
provenance across different services and applications.

## The role of image recipes

An AI-generated image is the result of a process, not just a prompt. The model, prompt or workflow, generating software,
parameters, and any input assets can all contribute to the final result. A recipe brings the available parts of this
context together with the image.

Recording a recipe can help creators:

- understand and, where possible, reproduce how an image was generated;
- identify the model, software, and source assets involved;
- trace relationships between generated images and their inputs or derivatives;
- review provenance and support accountability about the process used.

Together, these details support tracing image origins. If an image is later transformed or used to generate another
image, recording its input assets and generation context can contribute to a revision graph — a git-like history of the
image and its derivatives. This history can help creators account for the steps they took and provide useful provenance
when reviewing licensing, copyright-sensitive inputs, or applicable legislation.

Recipes are only as complete as the information available from the generation service or application and the extension
that captures it. They document provenance; they do not establish copyright ownership, licensing status, or legal
compliance.

## Anatomy of an image recipe

A recipe has required fields and optional context:

| Field           | Required | Purpose                                                              |
|:----------------|:--------:|:---------------------------------------------------------------------|
| `schemaVersion` |   Yes    | Identifies the version of the recipe schema.                         |
| `modelTags`     |   Yes    | Lists the model or model versions used for generation.               |
| `prompt`        |   Yes    | Holds the prompt or structured generation instructions.              |
| `id`            |    No    | Identifies the recipe or generation instance.                        |
| `url`           |    No    | Links to the generation request or result in an external service.    |
| `software`      |    No    | Identifies the application or service that performed the generation. |
| `author`        |    No    | Records the recipe author when known.                                |
| `inceptionDate` |    No    | Records when the recipe was created.                                 |
| `inputAssets`   |    No    | Lists identifiers or URLs for assets used as inputs.                 |
| `aspectRatio`   |    No    | Records the output image aspect ratio.                               |

The `prompt` field has two forms, identified by its `kind` value:

| Form           | Structure                    | Purpose                                                                                 |
|:---------------|:-----------------------------|:----------------------------------------------------------------------------------------|
| `textual`      | A `text` string.             | Represents a direct text prompt used by services that accept a natural-language prompt. |
| `instructions` | A structured `value` object. | Preserves a workflow, provider request, or tool-specific generation instructions.       |

The textual form provides a simple representation for prompt-based services. The instructions form can retain richer,
structured inputs without reducing every generation workflow to one text string. Both forms fit the same recipe schema,
allowing different extensions to record provenance in a consistent shape while preserving generation-specific details.

### Textual prompt example

```json
{
  "schemaVersion": 2,
  "modelTags": ["example/model"],
  "prompt": {
    "kind": "textual",
    "text": "A lighthouse on a rocky coast at dusk"
  }
}
```

### Instructions prompt example

```json
{
  "schemaVersion": 2,
  "modelTags": ["example/model"],
  "software": "ComfyUI",
  "prompt": {
    "kind": "instructions",
    "value": {
      "positivePrompt": "A lighthouse on a rocky coast at dusk",
      "negativePrompt": "low resolution",
      "seed": 12345
    }
  }
}
```

The contents of an `instructions` value depend on the generating software or service. Picteus records it as structured
data; the corresponding extension or integration is responsible for understanding its specific format.

For the general feature model and validation rules, see [Features](features.md). For the API endpoint that returns
parsed recipes associated with an image, see the [image web services reference](webservicesapi/images).

## Recipe storage and validation

In the feature model, a recipe is an `ImageFeatureType.RECIPE` feature with the `json` format. It is stored like other
image features, but the `setFeatures` and `ensureFeatures` web services validate its value against the recipe schema
before accepting it. See the [feature write endpoints](webservicesapi/images#features),
the [OpenAPI specification](https://github.com/picteus/picteus/blob/main/back-end/openapi.json), and
the [recipe JSON schema](https://github.com/picteus/picteus/blob/main/docs/static/jsonschema/recipe-v2.schema.json) for
the endpoint behavior and contract.
