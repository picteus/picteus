export const queryKeys =
{
  repositories: {
    all: [ "repositories" ] as const,
    detail: (repositoryId: string) => [ "repositories", repositoryId ] as const,
    summaries: (repositoryId: string, count: number) => [ "repositories", repositoryId, "summaries", count ] as const,
    tags: [ "repositories", "tags" ] as const,
    features: [ "repositories", "features" ] as const,
    embeddings: [ "repositories", "embeddings" ] as const,
    activities: [ "repositories", "activities" ] as const
  },
  collections: {
    all: [ "collections" ] as const,
    detail: (collectionId: number) => [ "collections", collectionId ] as const
  },
  extensions: {
    all: [ "extensions" ] as const,
    detail: (extensionId: string) => [ "extensions", extensionId ] as const,
    activities: [ "extensions", "activities" ] as const,
    aiModels: [ "extensions", "aiModels" ] as const,
    settings: (extensionId: string) => [ "extensions", extensionId, "settings" ] as const,
    instructions: (extensionId: string) => [ "extensions", extensionId, "instructions" ] as const
  },
  marketplace: {
    all: [ "marketplace" ] as const
  },
  images: {
    all: [ "images" ] as const,
    hasAny: [ "images", "hasAny" ] as const,
    detail: (imageId: string) => [ "images", imageId ] as const,
    allEmbeddings: (imageId: string) => [ "images", imageId, "allEmbeddings" ] as const,
    closestImages: (imageId: string, extensionId: string, aiModelTechnicalId: string, count: number) =>
      [ "images", imageId, "closestImages", extensionId, aiModelTechnicalId, count ] as const,
    recentSummaries: (imageIds: readonly string[]) => [ "images", "recentSummaries", imageIds ] as const,
    pickerSummaries: (scope: string, key: string) => [ "images", "pickerSummaries", scope, key ] as const,
    commandSummaries: (filterKey: string) => [ "images", "commandSummaries", filterKey ] as const
  }
} as const;
