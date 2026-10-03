import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Image } from "@picteus/ws-client";

import createHmrStableContext from "app/context/createHmrStableContext.ts";
import { StorageService } from "app/services";

import {
  computeAvailableSectionDescriptors,
  defaultOrderSectionIds,
  ImageDataSectionDescriptorType
} from "../components/ImageData/ImageDataComputer.ts";
import {
  ImageDataDrawerSectionItemType
} from "../components/ImageData/components/ImageCardsSettings/ImageCardsSettings.tsx";


export type ImageDataSectionsContextType =
  {
    readonly sections: ImageDataDrawerSectionItemType[];
    readonly hiddenSectionIds: string[];
    readonly hideSection: (sectionId: string) => void;
    readonly toggleSectionVisibility: (sectionId: string) => void;
    readonly reorderSections: (reorderedSections: ImageDataDrawerSectionItemType[]) => void;
    readonly restoreAllSections: () => void;
    readonly resetDefaults: () => void;
  };

export type ImageDataSectionsProviderPropsType =
  {
    readonly image: Image;
    readonly children: ReactNode;
  };

const ImageDataSectionsContext = createHmrStableContext<ImageDataSectionsContextType | null>(
  import.meta.hot,
  "imageDataSectionsContext",
  null
);

export function useImageDataSectionsContext(): ImageDataSectionsContextType
{
  const context = useContext(ImageDataSectionsContext);
  if (!context)
  {
    throw new Error(
      "useImageDataSectionsContext must be used within an ImageDataSectionsProvider"
    );
  }
  return context;
}

export function ImageDataSectionsProvider({
  image,
  children
}: ImageDataSectionsProviderPropsType): ReactNode
{
  const [ t ] = useTranslation();

  const [ hiddenSectionIds, setHiddenSectionIds ] = useState<string[]>(
    () => StorageService.getImageDetailHiddenSections([])
  );
  const [ sectionsOrder, setSectionsOrder ] = useState<string[]>(
    () => StorageService.getImageDetailSectionsOrder(defaultOrderSectionIds as unknown as string[])
  );

  useEffect(() =>
  {
    StorageService.setImageDetailHiddenSections(hiddenSectionIds);
  }, [ hiddenSectionIds ]);

  useEffect(() =>
  {
    StorageService.setImageDetailSectionsOrder(sectionsOrder);
  }, [ sectionsOrder ]);

  const availableSections = useMemo(
    () => computeAvailableSectionDescriptors(image, t),
    [ image, t ]
  );

  const effectiveSectionsOrder = useMemo<string[]>(() =>
    {
      const missingIds = availableSections.map((section) => section.id).filter((id) => !sectionsOrder.includes(id));
      if (missingIds.length === 0)
      {
        return sectionsOrder;
      }
      return [ ...sectionsOrder, ...missingIds ];
    },
    [ availableSections, sectionsOrder ]
  );

  const sortedAvailableSections = useMemo((): ImageDataSectionDescriptorType[] =>
    {
      const orderMap = new Map<string, number>();
      effectiveSectionsOrder.forEach((id, index) => orderMap.set(id, index));
      return [ ...availableSections ].sort((firstSection, secondSection) =>
      {
        const firstIndex = orderMap.get(firstSection.id) ?? Number.MAX_SAFE_INTEGER;
        const secondIndex = orderMap.get(secondSection.id) ?? Number.MAX_SAFE_INTEGER;
        return firstIndex - secondIndex;
      });
    },
    [ availableSections, effectiveSectionsOrder ]
  );

  const sections = useMemo((): ImageDataDrawerSectionItemType[] =>
    {
      return sortedAvailableSections.map((section) => ({
        id: section.id,
        label: section.label,
        isVisible: !hiddenSectionIds.includes(section.id),
        badge: section.badge
      }));
    },
    [ sortedAvailableSections, hiddenSectionIds ]
  );

  const hideSection = useCallback((sectionId: string): void =>
  {
    setHiddenSectionIds((previous) =>
      previous.includes(sectionId) ? previous : [ ...previous, sectionId ]
    );
  }, []);

  const toggleSectionVisibility = useCallback((sectionId: string): void =>
  {
    setHiddenSectionIds((previous) =>
      previous.includes(sectionId)
        ? previous.filter((id) => id !== sectionId)
        : [ ...previous, sectionId ]
    );
  }, []);

  const restoreAllSections = useCallback((): void =>
  {
    setHiddenSectionIds([]);
  }, []);

  const resetDefaults = useCallback((): void =>
  {
    setHiddenSectionIds([]);
    setSectionsOrder(defaultOrderSectionIds as unknown as string[]);
  }, []);

  const reorderSections = useCallback((reorderedSections: ImageDataDrawerSectionItemType[]): void =>
  {
    const reorderedIds = reorderedSections.map((section) => section.id);
    const remainingIds = effectiveSectionsOrder.filter((id) => !reorderedIds.includes(id));
    const newOrder = [ ...reorderedIds, ...remainingIds ];
    setSectionsOrder(newOrder);
  }, [ effectiveSectionsOrder ]);

  const contextValue = useMemo<ImageDataSectionsContextType>(() =>
      ({
        sections,
        hiddenSectionIds,
        hideSection,
        toggleSectionVisibility,
        reorderSections,
        restoreAllSections,
        resetDefaults
      }),
    [ sections, hiddenSectionIds, hideSection, toggleSectionVisibility, reorderSections, restoreAllSections, resetDefaults ]
  );

  return (
    <ImageDataSectionsContext.Provider value={contextValue}>
      {children}
    </ImageDataSectionsContext.Provider>
  );
}
