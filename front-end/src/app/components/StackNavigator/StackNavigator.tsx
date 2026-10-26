import React, {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ActionIcon, Anchor, Box, Breadcrumbs, CloseButton, Divider, Flex, Menu, Text, Tooltip } from "@mantine/core";
import { randomId, useElementSize, useFocusTrap } from "@mantine/hooks";
import { IconArrowLeft, IconChevronRight } from "@tabler/icons-react";

import { ActionModalValue } from "types";
import { ActionModalContext, ActionModalContextType, useActionModalContext } from "app/context";
import { useKey } from "app/hooks";
import { Common } from "app/components";

import style from "./StackNavigator.module.scss";


type StackedComponentType = ActionModalValue;

interface StackContextType
{
  push: (stackedComponent: StackedComponentType) => void;

  pop: () => void;

  popToIndex: (targetIndex: number) => void;

  popToRoot: () => void;

  set: (stackedComponents: StackedComponentType[]) => void;
}

const StackContext = createContext<StackContextType | null>(null);

export const useStackNavigator = (): StackContextType =>
{
  const context = useContext(StackContext);
  if (!context)
  {
    throw new Error("useStackNavigator must be used within a StackNavigator");
  }
  return context;
};

interface StackBreadcrumbsPropsType
{
  title: ReactNode;
  stack: StackedComponentType[];
  currentIndex: number;
  isVisible: boolean;
  popToIndex: (targetIndex: number) => void;
  popToRoot: () => void;
}

function StackBreadcrumbs({
  title,
  stack,
  currentIndex,
  isVisible,
  popToIndex,
  popToRoot
}: StackBreadcrumbsPropsType): ReactElement
{
  const { ref: containerRef, width: availableWidth } = useElementSize();
  const { ref: probeRef, width: uncollapsedWidth } = useElementSize();
  const tooltipPosition = "bottom";

  const stackSlice = useMemo((): StackedComponentType[] =>
  {
    return stack.slice(0, currentIndex + 1);
  }, [ stack, currentIndex ]);

  const canCollapse = isVisible === true && stackSlice.length >= 3;
  const isCollapsed = canCollapse === true && availableWidth > 0 && uncollapsedWidth > 0 && uncollapsedWidth > availableWidth;

  const separatorElement = useMemo((): ReactNode =>
  {
    return (
      <Box
        component="span"
        c="light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))"
        display="flex"
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
        size="sm"
        fw={500}
        underline="hover"
        truncate="end"
        maw={220}
        miw={40}
        display="inline-flex"
        onClick={popToRoot}
      >
        {title}
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
  }, [ title, popToRoot ]);

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
          size="sm"
          fw={500}
          underline="hover"
          truncate="end"
          maw={220}
          miw={40}
          display="inline-flex"
          onClick={() => popToIndex(itemIndex)}
        >
          {itemTitle}
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
      <Text
        key={component.id ?? `breadcrumb-current-${itemIndex}`}
        size="sm"
        fw={600}
        truncate="end"
        maw={320}
        miw={60}
        display="inline-flex"
      >
        {itemTitle}
      </Text>
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
      const collapsedComponents = stackSlice.slice(0, stackSlice.length - 2);
      const parentIndex = stackSlice.length - 2;
      const parentComponent = stackSlice[parentIndex];
      const currentComponent = stackSlice[stackSlice.length - 1];

      items.push(
        <Menu
          key="breadcrumb-ellipsis-menu"
          shadow="md"
          width={280}
          position="bottom-start"
          withinPortal
          classNames={{
            dropdown: style.menuDropdown,
            item: style.menuItem,
            itemLabel: style.menuItemLabel
          }}
        >
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size={24}
              radius="sm"
            >
              <Text fw={700} fz={18} lh={1}>…</Text>
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {collapsedComponents.map((component, componentIndex) =>
            {
              const itemTitle = component.title;
              const isStringTitle = typeof itemTitle === "string";

              const menuItemContent = (
                <Anchor
                  size="sm"
                  fw={500}
                  underline="hover"
                  truncate="end"
                  display="block"
                >
                  {itemTitle}
                </Anchor>
              );

              const wrappedItemContent = isStringTitle === true ? (
                <Tooltip
                  label={itemTitle}
                  openDelay={500}
                  withArrow
                  position={tooltipPosition}
                  withinPortal
                >
                  {menuItemContent}
                </Tooltip>
              ) : (
                menuItemContent
              );

              return (
                <Menu.Item
                  key={component.id ?? `collapsed-${componentIndex}`}
                  onClick={() => popToIndex(componentIndex)}
                >
                  {wrappedItemContent}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      );

      items.push(renderStackedItem(parentComponent, parentIndex, false));
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
  }, [ renderRootAnchor, renderStackedItem, isCollapsed, stackSlice, currentIndex, popToIndex ]);

  const probeBreadcrumbItems = useMemo((): ReactNode[] =>
  {
    if (canCollapse === false)
    {
      return [];
    }

    const items: ReactNode[] = [
      <Text key="probe-root" size="sm" fw={500} display="inline-flex">
        {title}
      </Text>
    ];

    for (let itemIndex = 0; itemIndex < stackSlice.length; itemIndex++)
    {
      const component = stackSlice[itemIndex];
      const isCurrentItem = itemIndex === currentIndex;
      const rawTitle = component.title;
      const itemTitle = (rawTitle !== undefined && rawTitle !== null && rawTitle !== "") ? rawTitle : "…";
      items.push(
        <Text
          key={component.id ?? `probe-item-${itemIndex}`}
          size="sm"
          fw={isCurrentItem ? 600 : 500}
          display="inline-flex"
        >
          {itemTitle}
        </Text>
      );
    }

    return items;
  }, [ canCollapse, title, stackSlice, currentIndex ]);

  return (
    <Box ref={containerRef} pos="relative" flex={1} miw={0} className={style.breadcrumbsWrapper}>
      <Breadcrumbs
        separator={separatorElement}
        separatorMargin={6}
        maw="100%"
        classNames={{ root: style.breadcrumbsRoot }}
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
            classNames={{ root: style.breadcrumbsRoot }}
          >
            {probeBreadcrumbItems}
          </Breadcrumbs>
        </Box>
      )}
    </Box>
  );
}

interface StackedElementPropsType
{
  stackedComponent: StackedComponentType;
  isVisible: boolean;
  withCloseButton?: boolean;
  title: ReactNode;
  stack: StackedComponentType[];
  currentIndex: number;
  pop: () => void;
  popToIndex: (targetIndex: number) => void;
  popToRoot: () => void;
}

function StackedElement({
  stackedComponent,
  isVisible,
  withCloseButton,
  title,
  stack,
  currentIndex,
  pop,
  popToIndex,
  popToRoot
}: StackedElementPropsType): ReactElement
{
  const focusTrapRef = useFocusTrap(isVisible);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() =>
  {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    return () =>
    {
      const element = returnFocusRef.current;
      if (element && typeof element.focus === "function")
      {
        setTimeout(() => element.focus({ preventScroll: true }), 10);
      }
    };
  }, []);

  return (
    <Flex
      ref={focusTrapRef}
      pos="absolute"
      inset={0}
      w="100%"
      h="100%"
      display={isVisible ? "flex" : "none"}
      direction="column"
    >
      {stackedComponent.isFullScreen !== true && (
        <>
          <Flex align="center" px="md" py={12} gap={12}>
            <ActionIcon
              variant="default"
              size={28}
              radius={6}
              onClick={pop}
            >
              <IconArrowLeft size={16} stroke={Common.IconStrokeSize}/>
            </ActionIcon>
            <StackBreadcrumbs
              title={title}
              stack={stack}
              currentIndex={currentIndex}
              isVisible={isVisible}
              popToIndex={popToIndex}
              popToRoot={popToRoot}
            />
            {withCloseButton && <CloseButton size="lg" variant="subtle" onClick={pop}/>}
          </Flex>
          <Divider/>
        </>
      )}
      <Box flex={1} className={style.componentWrapper}>
        {stackedComponent.body}
      </Box>
    </Flex>
  );
}

interface StackNavigatorPropsType
{
  children: ReactNode;
  title: ReactNode;
  resetTrigger?: unknown;
}

export default function StackNavigator({
  children,
  title,
  resetTrigger
}: StackNavigatorPropsType): ReactElement
{
  const [ stack, setStack ] = useState<StackedComponentType[]>([]);
  const stackRef = useRef<StackedComponentType[]>(stack);
  const parentModalContext = useActionModalContext();

  const push = useCallback((stackedComponent: StackedComponentType): void =>
  {
    const newStack = [ ...stackRef.current, stackedComponent ];
    stackRef.current = newStack;
    setStack(newStack);
  }, []);

  const pop = useCallback((): void =>
  {
    const currentStack = stackRef.current;
    if (currentStack.length === 0)
    {
      return;
    }
    const component = currentStack[currentStack.length - 1];
    const newStack = currentStack.slice(0, -1);
    stackRef.current = newStack;
    setStack(newStack);
    if (component.onBeforeClose !== undefined)
    {
      component.onBeforeClose(false);
    }
  }, []);

  const popToIndex = useCallback((targetIndex: number): void =>
  {
    const currentStack = stackRef.current;
    if (targetIndex < 0 || targetIndex >= currentStack.length - 1)
    {
      return;
    }
    const poppedComponents = currentStack.slice(targetIndex + 1);
    const newStack = currentStack.slice(0, targetIndex + 1);
    stackRef.current = newStack;
    setStack(newStack);
    for (let index = poppedComponents.length - 1; index >= 0; index--)
    {
      const component = poppedComponents[index];
      if (component.onBeforeClose !== undefined)
      {
        component.onBeforeClose(false);
      }
    }
  }, []);

  useKey("Escape", () =>
  {
    if (stackRef.current.length > 0 && stackRef.current[stackRef.current.length - 1].closeOnEscape !== false)
    {
      pop();
    }
  });

  const popToRoot = useCallback((): void =>
  {
    const currentStack = stackRef.current;
    if (currentStack.length === 0)
    {
      return;
    }
    const newStack: StackedComponentType[] = [];
    stackRef.current = newStack;
    setStack(newStack);
    for (let index = currentStack.length - 1; index >= 0; index--)
    {
      const component = currentStack[index];
      if (component.onBeforeClose !== undefined)
      {
        component.onBeforeClose(false);
      }
    }
  }, []);

  useEffect(() =>
  {
    popToRoot();
  }, [ resetTrigger, popToRoot ]);

  const set = useCallback((stackedComponents: StackedComponentType[]): void =>
  {
    setStack(stackedComponents);
    stackRef.current = stackedComponents;
  }, []);

  const addModal = useCallback((modal: ActionModalValue): string =>
  {
    if (modal.isStackable === true)
    {
      const id = modal.id ?? randomId();
      const modalWithId: ActionModalValue = { ...modal, id };
      push(modalWithId);
      return id;
    }
    return parentModalContext.addModal(modal);
  }, [ parentModalContext, push ]);

  const removeModal = useCallback((id: string): void =>
  {
    const currentStack = stackRef.current;
    const index = currentStack.findIndex(candidate => candidate.id === id);
    if (index === -1)
    {
      parentModalContext.removeModal(id);
      return;
    }
    const component = currentStack[index];
    if (component.onBeforeClose !== undefined)
    {
      component.onBeforeClose(false);
    }
    const newStack = currentStack.filter(candidate => candidate.id !== id);
    stackRef.current = newStack;
    setStack(newStack);
  }, [ parentModalContext ]);

  const subscribeToModals = useCallback(() => () =>
  {
  }, []);

  const actionModalContextValue = useMemo<ActionModalContextType>(() => ({
    modals: stack,
    addModal,
    removeModal,
    subscribeToModals
  }), [ stack, addModal, removeModal, subscribeToModals ]);

  const stackContextValue = useMemo<StackContextType>(() => ({
    push,
    pop,
    popToIndex,
    popToRoot,
    set
  }), [ push, pop, popToIndex, popToRoot, set ]);

  const renderedStack = useMemo((): ReactElement[] => (stack.map((stackedComponentWithId, index) =>
  {
    const isVisibleComponent = index === stack.length - 1;
    return (
      <StackedElement
        key={stackedComponentWithId.id}
        stackedComponent={stackedComponentWithId}
        isVisible={isVisibleComponent}
        withCloseButton={stackedComponentWithId.withCloseButton}
        title={title}
        stack={stack}
        currentIndex={index}
        pop={pop}
        popToIndex={popToIndex}
        popToRoot={popToRoot}
      />
    );
  })), [ stack, pop, popToIndex, popToRoot, title ]);

  return (
    <ActionModalContext.Provider value={actionModalContextValue}>
      <StackContext.Provider value={stackContextValue}>
        <Box pos="relative" w="100%" h="100%" className={style.container}>
          <Box
            pos="absolute"
            inset={0}
            w="100%"
            h="100%"
            display={stack.length === 0 ? undefined : "none"}
            className={style.content}
          >
            {children}
          </Box>
          {renderedStack}
        </Box>
      </StackContext.Provider>
    </ActionModalContext.Provider>
  );
}
