export const queryKeys =
{
  repositories: {
    all: [ "repositories" ] as const,
    detail: (repositoryId: string) => [ "repositories", repositoryId ] as const,
    tags: [ "repositories", "tags" ] as const,
    features: [ "repositories", "features" ] as const,
    embeddings: [ "repositories", "embeddings" ] as const
  },
  collections: {
    all: [ "collections" ] as const,
    detail: (collectionId: number) => [ "collections", collectionId ] as const
  },
  extensions: {
    all: [ "extensions" ] as const,
    detail: (extensionId: string) => [ "extensions", extensionId ] as const,
    configuration: [ "extensions", "configuration" ] as const,
    activities: [ "extensions", "activities" ] as const
  }
} as const;
