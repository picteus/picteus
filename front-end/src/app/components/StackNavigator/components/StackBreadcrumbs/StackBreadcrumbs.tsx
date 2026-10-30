import React, { ReactElement, ReactNode, useCallback, useMemo } from "react";
import { Anchor, Box, Breadcrumbs, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ActionModalValue, ContentIconType } from "types";
import { Common, ContentIcon } from "app/components";

import style from "./StackBreadcrumbs.module.scss";


type StackedComponentType = ActionModalValue;

export interface StackBreadcrumbsPropsType
{
  title: ReactNode;
  icon?: ContentIconType;
  stack: StackedComponentType[];
  currentIndex: number;
  isVisible: boolean;
  popToIndex: (targetIndex: number) => void;
  popToRoot: () => void;
}

export default function StackBreadcrumbs({
  title,
  icon,
  stack,
  currentIndex,
  isVisible,
  popToIndex,
  popToRoot
}: StackBreadcrumbsPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const { ref: containerRef, width: availableWidth } = useElementSize();
  const { ref: probeRef, width: uncollapsedWidth } = useElementSize();
  const tooltipPosition = "bottom";

  const stackSlice = useMemo((): StackedComponentType[] =>
  {
    return stack.slice(0, currentIndex + 1);
  }, [ stack, currentIndex ]);

  const canCollapse = isVisible === true && stackSlice.length >= 2;
  const isCollapsed = canCollapse === true && availableWidth > 0 && uncollapsedWidth > 0 && uncollapsedWidth > availableWidth;

  const separatorElement = useMemo((): ReactNode =>
  {
    return (
      <Box
        component="span"
        c="light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))"
        display="flex"
        flex="0 0 auto"
      >
        <IconChevronRight size={14} stroke={Common.IconStrokeSize}/>
      </Box>
    );
  }, []);

  const renderRootAnchor = useCallback((): ReactNode =>
  {
    const isStringTitle = typeof title === "string";
    const rootAnchorElement = (
      <Anchor
        key="breadcrumb-root"
        component="button"
        type="button"
        underline="hover"
        size="sm"
        px={6}
        py={3}
        miw={0}
        maw="100%"
        flex="0 1 auto"
        bdrs={5}
        className={style.crumbAnchor}
        onClick={popToRoot}
      >
        <Group gap={6} wrap="nowrap" maw="100%" miw={0}>
          {icon !== undefined && (
            <Box flex="0 0 auto" display="flex">
              <ContentIcon icon={icon} size={22}/>
            </Box>
          )}
          <Text size="sm" fw={500} truncate="end" flex={1} miw={0} c="inherit">
            {title}
          </Text>
        </Group>
      </Anchor>
    );

    if (isStringTitle === true)
    {
      return (
        <Tooltip
          key="breadcrumb-root"
          label={title}
          openDelay={500}
          withArrow
          position={tooltipPosition}
        >
          {rootAnchorElement}
        </Tooltip>
      );
    }

    return rootAnchorElement;
  }, [ icon, title, popToRoot ]);

  const renderStackedItem = useCallback((component: StackedComponentType, itemIndex: number, isCurrentItem: boolean): ReactNode =>
  {
    const rawTitle = component.title;
    const itemTitle = (rawTitle !== undefined && rawTitle !== null && rawTitle !== "") ? rawTitle : "…";
    const isStringTitle = typeof itemTitle === "string";

    if (isCurrentItem === false)
    {
      const anchorElement = (
        <Anchor
          key={component.id ?? `breadcrumb-link-${itemIndex}`}
          component="button"
          type="button"
          underline="hover"
          size="sm"
          px={6}
          py={3}
          miw={0}
          maw="100%"
          flex="0 1 auto"
          bdrs={5}
          className={style.crumbAnchor}
          onClick={() => popToIndex(itemIndex)}
        >
          <Group gap={6} wrap="nowrap" maw="100%" miw={0}>
            {component.icon !== undefined && (
              <Box flex="0 0 auto" display="flex">
                <ContentIcon icon={component.icon} size={22}/>
              </Box>
            )}
            <Text size="sm" fw={500} truncate="end" flex={1} miw={0} c="inherit">
              {itemTitle}
            </Text>
          </Group>
        </Anchor>
      );

      if (isStringTitle === true)
      {
        return (
          <Tooltip
            key={component.id ?? `breadcrumb-item-${itemIndex}`}
            label={itemTitle}
            openDelay={500}
            withArrow
            position={tooltipPosition}
          >
            {anchorElement}
          </Tooltip>
        );
      }

      return anchorElement;
    }

    const currentElement = (
      <Group
        key={component.id ?? `breadcrumb-current-${itemIndex}`}
        gap={6}
        wrap="nowrap"
        px={6}
        py={3}
        miw={0}
        maw="100%"
        flex="0 1 auto"
      >
        {component.icon !== undefined && (
          <Box flex="0 0 auto" display="flex">
            <ContentIcon icon={component.icon} size={22}/>
          </Box>
        )}
        <Text size="sm" fw={700} truncate="end" flex={1} miw={0} c="var(--mantine-color-text)">
          {itemTitle}
        </Text>
      </Group>
    );

    if (isStringTitle === true)
    {
      return (
        <Tooltip
          key={component.id ?? `breadcrumb-item-${itemIndex}`}
          label={itemTitle}
          openDelay={500}
          withArrow
          position={tooltipPosition}
        >
          {currentElement}
        </Tooltip>
      );
    }

    return currentElement;
  }, [ popToIndex ]);

  const breadcrumbItems = useMemo((): ReactNode[] =>
  {
    const items: ReactNode[] = [ renderRootAnchor() ];

    if (isCollapsed === true)
    {
      const hasParent = stackSlice.length >= 3;
      const collapsedComponents = hasParent === true
        ? stackSlice.slice(0, stackSlice.length - 2)
        : stackSlice.slice(0, stackSlice.length - 1);
      const parentIndex = stackSlice.length - 2;
      const parentComponent = hasParent === true ? stackSlice[parentIndex] : null;
      const currentComponent = stackSlice[stackSlice.length - 1];

      items.push(
        <Menu
          key="breadcrumb-collapsed-menu"
          shadow="md"
          radius={8}
          position="bottom-start"
          withinPortal
          classNames={{
            dropdown: style.menuDropdown,
            item: style.menuItem,
            itemLabel: style.menuItemLabel
          }}
        >
          <Menu.Target>
            <UnstyledButton
              className={style.collapsedPill}
              type="button"
              flex="0 0 auto"
              bg="light-dark(#EDF2FA, var(--mantine-color-dark-5))"
              px={6}
              py={3}
            >
              <Group gap={6} wrap="nowrap">
                <Group gap={0} wrap="nowrap">
                  {collapsedComponents.slice(0, 2).map((component, thumbnailIndex) => (
                    <Box
                      key={component.id ?? `pill-thumb-${thumbnailIndex}`}
                      ml={thumbnailIndex > 0 ? -8 : 0}
                      pos="relative"
                    >
                      <ContentIcon
                        icon={component.icon}
                        size={20}
                        withBorder
                      />
                    </Box>
                  ))}
                </Group>
                <Text
                  size="xs"
                  fw={500}
                  c="light-dark(#878F96, var(--mantine-color-dark-2))"
                  lh={1}
                >
                  +{collapsedComponents.length}
                </Text>
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown p={6} miw={260} maw={460}>
            {collapsedComponents.map((component, componentIndex) =>
            {
              const rawTitle = component.title;
              const itemTitle = (rawTitle !== undefined && rawTitle !== null && rawTitle !== "") ? rawTitle : "…";
              const isStringTitle = typeof itemTitle === "string";

              const menuItemInner = (
                <Group gap={10} wrap="nowrap" w="100%" maw="100%" miw={0}>
                  <Box flex="0 0 auto" display="flex">
                    <ContentIcon icon={component.icon} size={32}/>
                  </Box>
                  <Stack gap={1} miw={0} maw="100%" flex={1}>
                    <Text
                      size="sm"
                      fw={500}
                      c="light-dark(#1C73CC, var(--mantine-color-blue-4))"
                      truncate="end"
                      lh={1.25}
                    >
                      {itemTitle}
                    </Text>
                    {component.subtitle && (
                      <Text
                        size="xs"
                        fw={400}
                        c="light-dark(#878F96, var(--mantine-color-dark-2))"
                        truncate="end"
                        lh={1.25}
                      >
                        {component.subtitle}
                      </Text>
                    )}
                  </Stack>
                </Group>
              );

              return (
                <Menu.Item
                  key={component.id ?? `collapsed-${componentIndex}`}
                  px={10}
                  py={6}
                  onClick={() => popToIndex(componentIndex)}
                >
                  {isStringTitle === true ? (
                    <Tooltip
                      label={itemTitle}
                      openDelay={500}
                      withArrow
                      position={tooltipPosition}
                      withinPortal
                    >
                      {menuItemInner}
                    </Tooltip>
                  ) : (
                    menuItemInner
                  )}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      );

      if (parentComponent !== null)
      {
        items.push(renderStackedItem(parentComponent, parentIndex, false));
      }
      items.push(renderStackedItem(currentComponent, stackSlice.length - 1, true));

      return items;
    }

    for (let itemIndex = 0; itemIndex < stackSlice.length; itemIndex++)
    {
      const component = stackSlice[itemIndex];
      const isCurrentItem = itemIndex === currentIndex;
      items.push(renderStackedItem(component, itemIndex, isCurrentItem));
    }

    return items;
  }, [ renderRootAnchor, renderStackedItem, isCollapsed, stackSlice, currentIndex, popToIndex, t ]);

  const probeBreadcrumbItems = useMemo((): ReactNode[] =>
  {
    if (canCollapse === false)
    {
      return [];
    }

    const items: ReactNode[] = [
      <Group key="probe-root" gap={6} wrap="nowrap" px={6} py={3}>
        {icon !== undefined && <Box w={22} h={22} flex="0 0 auto"/>}
        <Text size="sm" fw={500}>{title}</Text>
      </Group>
    ];

    for (let itemIndex = 0; itemIndex < stackSlice.length; itemIndex++)
    {
      const component = stackSlice[itemIndex];
      const isCurrentItem = itemIndex === currentIndex;
      const rawTitle = component.title;
      const itemTitle = (rawTitle !== undefined && rawTitle !== null && rawTitle !== "") ? rawTitle : "…";
      items.push(
        <Group
          key={component.id ?? `probe-item-${itemIndex}`}
          gap={6}
          wrap="nowrap"
          px={6}
          py={3}
        >
          {component.icon !== undefined && <Box w={22} h={22} flex="0 0 auto"/>}
          <Text size="sm" fw={isCurrentItem ? 700 : 500}>
            {itemTitle}
          </Text>
        </Group>
      );
    }

    return items;
  }, [ canCollapse, icon, title, stackSlice, currentIndex ]);

  return (
    <Box ref={containerRef} pos="relative" flex={1} miw={0} className={style.breadcrumbsWrapper}>
      <Breadcrumbs
        separator={separatorElement}
        separatorMargin={6}
        maw="100%"
        classNames={{
          root: style.breadcrumbsRoot,
          breadcrumb: style.breadcrumb
        }}
      >
        {breadcrumbItems}
      </Breadcrumbs>
      {canCollapse === true && (
        <Box
          ref={probeRef}
          pos="absolute"
          top={0}
          left={0}
          h={0}
          w="max-content"
          maw="none"
          opacity={0}
          className={style.probeContainer}
        >
          <Breadcrumbs
            separator={separatorElement}
            separatorMargin={6}
            classNames={{ root: style.probeBreadcrumbsRoot }}
          >
            {probeBreadcrumbItems}
          </Breadcrumbs>
        </Box>
      )}
    </Box>
  );
}
