import * as React from "react";
import { KeyboardEvent, useEffect, useState } from "react";

import { Configuration, ImageApi, RepositoryApi, SearchParameters } from "@picteus/ws-client";

import "./App.css";

export default () => {
  const [extensionId, setExtensionId] = useState<string>();
  const [configuration, setConfiguration] = useState<Configuration>();
  const [imageIds, setImageIds] = useState<string[]>();

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [knownTags, setKnownTags] = useState<string[]>([]);

  // The global list of tags applied to all selected images
  const [commonTags, setCommonTags] = useState<string[]>([]);
  // Local input state for the global tags field
  const [newTagInput, setNewTagInput] = useState<string>("");

  // Individual tags for displaying the current state per image
  const [imageTagsMap, setImageTagsMap] = useState<Record<string, string[]>>({});

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const data = await (await fetch(window.location.href.split("?")[0].replace(/index\.html$/, ""))).json();
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

  const handleGlobalInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const tagValue = newTagInput.trim();
      if (tagValue) {
        if (!commonTags.includes(tagValue)) {
          setCommonTags(prev => [...prev, tagValue]);
          if (!knownTags.includes(tagValue)) {
            setKnownTags(prev => [...prev, tagValue]);
          }
        }
        setNewTagInput("");
      }
    }
  };

  const handleGlobalRemoveTag = (tagToRemove: string) => {
    setCommonTags(prev => prev.filter(t => t !== tagToRemove));
  };

  return (
    <div className="app-container">
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)} title="Dismiss">×</button>
        </div>
      )}

      <datalist id="known-tags">
        {knownTags.map(tag => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      <div className="global-controls">
        <div className="global-top-row">
          <div className="tag-input-container">
            <input
              type="text"
              placeholder="Type a tag and press Enter..."
              list="known-tags"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleGlobalInputKeyDown}
            />
          </div>
          <button className="apply-btn" onClick={handleApplyTagsToAllImages}>
            Apply
          </button>
        </div>

        <div className="global-tags-container">
          {commonTags.length === 0 && <span className="tag-chip">No tags to apply</span>}
          {commonTags.map(tag => (
            <span key={tag} className="tag-chip">
              {tag}
              <button className="tag-remove-btn" onClick={() => handleGlobalRemoveTag(tag)} title="Remove tag">×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="images-grid">
        {imageIds && imageIds.map(imageId => (
          <div key={imageId} className="image-card">
            <div className="thumbnail-container">
              {imageUrls[imageId] ? <img src={imageUrls[imageId]} alt="Thumbnail" /> : <div className="loading-placeholder" />}
            </div>

            <div className="tags-container">
              {imageTagsMap[imageId]?.map(tag => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
              {(!imageTagsMap[imageId] || imageTagsMap[imageId].length === 0) && (
                <span className="tag-chip" style={{ background: "transparent", border: "1px dashed var(--border-color)", padding: "2px 6px" }}>
                  No tags
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
