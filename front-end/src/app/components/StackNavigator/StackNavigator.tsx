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
import { ActionIcon, Box, CloseButton, Divider, Flex } from "@mantine/core";
import { randomId, useFocusTrap } from "@mantine/hooks";
import { Icon, IconArrowLeft } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ActionModalValue, ContentIconType } from "types";
import { ActionModalContext, ActionModalContextType, useActionModalContext } from "app/context";
import { useKey } from "app/hooks";
import { Common } from "app/components";
import { StackBreadcrumbs } from "./components";

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

interface StackedElementPropsType
{
  stackedComponent: StackedComponentType;
  isVisible: boolean;
  withCloseButton?: boolean;
  title: ReactNode;
  icon?: ContentIconType;
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
  icon,
  stack,
  currentIndex,
  pop,
  popToIndex,
  popToRoot
}: StackedElementPropsType): ReactElement
{
  const [ t ] = useTranslation();
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
      bg="var(--mantine-color-body)"
      display={isVisible ? "flex" : "none"}
      direction="column"
    >
      {stackedComponent.isFullScreen !== true && (
        <>
          <Flex align="center" px="md" py={10} gap={8} miw={0} maw="100%">
            <ActionIcon
              variant="default"
              size={28}
              radius={5}
              onClick={pop}
              aria-label={t("stackNavigator.back")}
              flex="0 0 auto"
            >
              <IconArrowLeft size={16} stroke={Common.IconStrokeSize}/>
            </ActionIcon>
            <StackBreadcrumbs
              title={title}
              icon={icon}
              stack={stack}
              currentIndex={currentIndex}
              isVisible={isVisible}
              popToIndex={popToIndex}
              popToRoot={popToRoot}
            />
            {withCloseButton && (
              <CloseButton
                size="lg"
                variant="subtle"
                onClick={pop}
                flex="0 0 auto"
              />
            )}
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

export interface StackNavigatorPropsType
{
  children: ReactNode;
  title: ReactNode;
  icon: Icon;
  resetTrigger?: unknown;
}

export default function StackNavigator({
  children,
  title,
  icon,
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

  const actionModalContextValue = useMemo<ActionModalContextType>(() => ({
    modals: parentModalContext.modals,
    addModal,
    removeModal,
    subscribeToModals: parentModalContext.subscribeToModals
  }), [ parentModalContext.modals, parentModalContext.subscribeToModals, addModal, removeModal ]);

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
        icon={{ icon }}
        stack={stack}
        currentIndex={index}
        pop={pop}
        popToIndex={popToIndex}
        popToRoot={popToRoot}
      />
    );
  })), [ stack, pop, popToIndex, popToRoot, title, icon ]);

  const contentClassName = `${style.content}${stack.length > 0 ? ` ${style.contentHidden}` : ""}`;

  return (
    <ActionModalContext.Provider value={actionModalContextValue}>
      <StackContext.Provider value={stackContextValue}>
        <Box pos="relative" w="100%" h="100%" className={style.container}>
          <Box
            pos="absolute"
            inset={0}
            w="100%"
            h="100%"
            className={contentClassName}
          >
            {children}
          </Box>
          {renderedStack}
        </Box>
      </StackContext.Provider>
    </ActionModalContext.Provider>
  );
}
