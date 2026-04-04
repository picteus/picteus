import * as React from "react";
import { useEffect, useState } from "react";

import { Configuration, ImageApi, RepositoryApi, SearchParameters } from "@picteus/ws-client";
import {
  AspectRatio,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Image,
  Notification,
  SimpleGrid,
  Skeleton,
  TagsInput
} from "@mantine/core";

import "./App.css";

export default () => {
  const [extensionId, setExtensionId] = useState<string>();
  const [configuration, setConfiguration] = useState<Configuration>();
  const [imageIds, setImageIds] = useState<string[]>();

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [knownTags, setKnownTags] = useState<string[]>([]);

  // The global list of tags applied to all selected images
  const [commonTags, setCommonTags] = useState<string[]>([]);

  // Individual tags for displaying the current state per image
  const [imageTagsMap, setImageTagsMap] = useState<Record<string, string[]>>({});

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const data = await (await fetch(`${window.location.origin}${window.location.pathname.split("/").slice(0, -1).join("/")}`)).json();
      if (data === undefined) {
        setError("Could not access to the parameters");
        return;
      }
      const parameters: Record<string, any> = data.parameters;
      setExtensionId(parameters.extensionId);
      setConfiguration(new Configuration({ basePath: parameters.webServicesBaseUrl, apiKey: parameters.apiKey }));
      setImageIds(data.settings.imageIds);
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (configuration !== undefined && imageIds !== undefined && extensionId !== undefined) {
        const imageApi = new ImageApi(configuration);
        const repositoryApi = new RepositoryApi(configuration);

        // Fetch Image URLs
        const urls: Record<string, string> = {};
        for (const imageId of imageIds) {
          const media = await imageApi.imageMediaUrl({ id: imageId });
          urls[imageId] = media.url;
        }
        setImageUrls(urls);

        // Fetch known tags for Autocomplete
        try {
          const fetchedGlobalTags = await repositoryApi.repositoryGetTags();
          const extTags = fetchedGlobalTags.filter((t: any) => t.id === extensionId).map((t: any) => t.value);
          setKnownTags(Array.from(new Set(extTags)));
        } catch (e: any) {
          console.error(e);
          setError("Failed to fetch available tags: " + (e.message || "Unknown error"));
        }

        // Fetch all assigned tags for the selected images
        const searchParameters: SearchParameters = {
          filter: {
            origin: {
              kind: "images",
              ids: imageIds
            } as any
          }
        };
        try {
          const tagsResult = await imageApi.imageSearchTags({ searchParameters, extensionIds: [extensionId] });
          const newMap: Record<string, string[]> = {};

          for (const id of imageIds) {
            newMap[id] = [];
          }

          if (tagsResult.items) {
            for (const imgAttr of tagsResult.items) {
              const imgTags = imgAttr.attribute.filter((t: any) => t.id === extensionId).map((t: any) => t.value);
              if (newMap[imgAttr.id] !== undefined) {
                newMap[imgAttr.id] = imgTags;
              }
            }
          }
          setImageTagsMap(newMap);

          // We compute the "commonTags" which are the union of all existing tags, or just intersection.
          // Let's use intersection (tags present on ALL images) for the common editor.
          if (imageIds.length > 0) {
            let intersection = newMap[imageIds[0]] || [];
            for (let i = 1; i < imageIds.length; i++) {
              const currentImageTags = newMap[imageIds[i]] || [];
              intersection = intersection.filter(tag => currentImageTags.includes(tag));
            }
            setCommonTags(intersection);
          }

        } catch (e: any) {
          console.error(e);
          setError("Failed to fetch current image tags: " + (e.message || "Unknown error"));
        }
      }
    };
    void run();
  }, [configuration, imageIds, extensionId]);

  const handleApplyTagsToAllImages = async () => {
    if (!extensionId || !configuration || !imageIds) return;

    const updatedMap: Record<string, string[]> = { ...imageTagsMap };
    for (const id of imageIds) {
      // User requested: "ensure all tags are set with the same value for all images".
      updatedMap[id] = [...commonTags];
    }
    setImageTagsMap(updatedMap);

    const imageApi = new ImageApi(configuration);

    for (const id of imageIds) {
      try {
        await imageApi.imageSetTags({
          id,
          extensionId,
          requestBody: commonTags
        });
      } catch (e: any) {
        console.error(`Failed to set tags for image ${id}`, e);
        setError(`Failed to set tags for image ${id} ` + (e.message || "Unknown error"));
      }
    }
  };

  // No longer need manual enter or remove handlers, handled by TagsInput / MultiSelect

  return (
    <Container size="xl" py="xl">
      {error && (
        <Notification color="red" title="Error" onClose={() => setError(null)} mb="xl">
          {error}
        </Notification>
      )}

      <Card withBorder radius="md" p="md" mb="xl">
        <Group mb="md" align="flex-end">
          <TagsInput
            placeholder="Type or select tags..."
            data={knownTags}
            value={commonTags}
            onChange={(val) => {
              setCommonTags(val);
              const newTags = val.filter(v => !knownTags.includes(v));
              if (newTags.length > 0) {
                setKnownTags([...knownTags, ...newTags]);
              }
            }}
            style={{ flex: 1 }}
          />
          <Button onClick={handleApplyTagsToAllImages}>Apply</Button>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 3 }} spacing="md">
        {imageIds && imageIds.map(imageId => (
          <Card key={imageId} withBorder radius="md" p={0}>
            <Card.Section>
              <AspectRatio ratio={16 / 9} bg="dark.4">
                {imageUrls[imageId] ? (
                  <Image src={imageUrls[imageId]} fit="cover" />
                ) : (
                  <Skeleton height="100%" radius={0} />
                )}
              </AspectRatio>
            </Card.Section>

            <Group gap="xs" p="md">
              {imageTagsMap[imageId]?.map(tag => (
                <Badge key={tag} variant="light">
                  {tag}
                </Badge>
              ))}
              {(!imageTagsMap[imageId] || imageTagsMap[imageId].length === 0) && (
                <Badge variant="outline" color="gray" style={{ borderStyle: "dashed" }}>
                  No tags
                </Badge>
              )}
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
};
