# User manual

The user manual explains the conceptual entities that make up Picteus and how to operate and configure the application after installation. Understanding these entities is important for properly understanding the scope of Picteus, its data model, its enrichment workflows, and the services that expose them. The section also covers storage, image enrichment, web services, and the application container so that users can choose the appropriate workflow for their environment.

## Documentation in this section

- [Web services API](manual/webservicesapi/index.md) — use the shared API guidance and navigate to endpoint documentation by domain;
- [Databases](manual/databases.md) — understand the relational and vector databases used to persist Picteus data;
- [Facets](manual/facets.md) — understand built-in metadata and the tags, features, and embeddings enrichment model;
- [Tags](manual/tags.md) — configure and use categorical image tags;
- [Features](manual/features.md) — work with structured image features, validation, and recipes;
- [Embeddings](manual/embedding.md) — use vector embeddings and similarity search;
- [Container](manual/container.md) — run Picteus in its containerized environment and access its exposed services;

## Guidance

Start with [Facets](manual/facets.md) to understand the conceptual entities and data model. Use [Tags](manual/tags.md), [Features](manual/features.md), and [Embeddings](manual/embedding.md) for the corresponding enrichment mechanisms, and consult [Databases](manual/databases.md) when storage or maintenance details matter.

The [Web services API](manual/webservicesapi/index.md) is the entry point for programmatic access. Its overview contains conventions shared by all services, while its domain documentation describes the available endpoint groups. Use [Container](manual/container.md) for deployment-specific instructions.
