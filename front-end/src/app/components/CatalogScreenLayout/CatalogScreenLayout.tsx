import { ForwardRefExoticComponent, ReactElement, ReactNode, RefAttributes } from "react";
import { Stack } from "@mantine/core";
import { IconProps } from "@tabler/icons-react";

import Container from "../Container/Container.tsx";
import EmptyResults from "../EmptyResults/EmptyResults.tsx";
import LoadingView from "../LoadingView/LoadingView.tsx";
import { EdgeScrollArea } from "./components";


export type CatalogEmptyStateType = {
  readonly title: string;
  readonly description: string;
  readonly buttonText: string;
  readonly buttonAction: () => void;
};

export type CatalogFilteredEmptyStateType = {
  readonly title: string;
  readonly description: string;
  readonly clearButtonText: string;
  readonly onClear: () => void;
};

type CatalogScreenLayoutPropsType = {
  readonly header: ReactNode;
  readonly toolbar: ReactNode;
  readonly isInitialLoading: boolean;
  readonly isBusyLoading: boolean;
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly hasActiveFilters: boolean;
  readonly emptyIcon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
  readonly emptyState: CatalogEmptyStateType;
  readonly filteredEmptyState: CatalogFilteredEmptyStateType;
  readonly emptyScopeFallback: ReactElement | undefined;
  readonly children: ReactNode;
};

export default function CatalogScreenLayout({
  header,
  toolbar,
  isInitialLoading,
  isBusyLoading,
  totalCount,
  visibleCount,
  hasActiveFilters,
  emptyIcon,
  emptyState,
  filteredEmptyState,
  emptyScopeFallback,
  children
}: CatalogScreenLayoutPropsType): ReactElement
{
  function renderContent(): ReactElement
  {
    if (isInitialLoading === false && totalCount === 0)
    {
      return (
        <EmptyResults
          icon={emptyIcon}
          title={emptyState.title}
          description={emptyState.description}
          buttonText={emptyState.buttonText}
          buttonAction={emptyState.buttonAction}
        />
      );
    }

    if (isInitialLoading === false && visibleCount === 0)
    {
      if (hasActiveFilters === true)
      {
        return (
          <EmptyResults
            icon={emptyIcon}
            isSmall={true}
            title={filteredEmptyState.title}
            description={filteredEmptyState.description}
            buttonText={filteredEmptyState.clearButtonText}
            buttonAction={filteredEmptyState.onClear}
          />
        );
      }

      if (emptyScopeFallback !== undefined)
      {
        return emptyScopeFallback;
      }

      return (
        <EmptyResults
          icon={emptyIcon}
          isSmall={true}
          title={filteredEmptyState.title}
          description={filteredEmptyState.description}
        />
      );
    }

    return (
      <LoadingView visible={isBusyLoading}>
        {children}
      </LoadingView>
    );
  }

  return (
    <Container>
      <Stack gap="lg" h="100%">
        {header}
        {toolbar}
        <EdgeScrollArea>
          {renderContent()}
        </EdgeScrollArea>
      </Stack>
    </Container>
  );
}
