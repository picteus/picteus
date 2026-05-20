import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Box, CloseButton, Flex, Title } from "@mantine/core";
import { useFocusTrap } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";

import { ActionModalValue } from "types";
import useKey from "app/hooks/useKey.tsx";

import style from "./StackNavigator.module.scss";


type StackedComponentType = ActionModalValue;

type ListenerType = (stackedComponent: StackedComponentType, isPopped: boolean) => void;

interface StackContextType {
  push: (stackedComponent: StackedComponentType) => void;
  pop: () => void;
  popToRoot: () => void;
  set: (stackedComponents: StackedComponentType[]) => void;
  subscribe: (listener: ListenerType) => (() => void);
}

const StackContext = createContext<StackContextType | null>(null);

export const useStackNavigator = () => {
  const context = useContext(StackContext);
  if (!context) {
    throw new Error("useStackNavigator must be used within a StackNavigator");
  }
  return context;
};

interface StackedElementType {
  stackedComponent: StackedComponentType;
  visible: boolean;
  pop: () => void;
}

function StackedElement({ stackedComponent, visible, pop }: StackedElementType) {
  const focusTrapRef = useFocusTrap(visible);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const element = returnFocusRef.current;
      if (element && typeof element.focus === "function") {
        setTimeout(() => element.focus({ preventScroll: true }), 10);
      }
    };
  }, []);

  return (
    <Flex
      ref={focusTrapRef}
      className={`${style.stack}${visible ? "" : ` ${style.stackHidden}`}`}
      direction="column"
    >
      {stackedComponent.fullScreen !== true && <Flex align="center" p="md" gap="md" className={style.topBar}>
        <ActionIcon variant="default" onClick={pop}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        {stackedComponent.title && (
          <Title order={4} style={{ flex: 1 }}>
            {stackedComponent.title}
          </Title>
        )}
        <CloseButton size="lg" variant="subtle" onClick={pop} />
      </Flex>}
      <Box flex={1} className={style.componentWrapper}>
        {stackedComponent.component}
      </Box>
    </Flex>
  );
}

interface StackNavigatorType {
  children: ReactNode;
}

export default function StackNavigator ({ children }: StackNavigatorType) {
  const [stack, setStack] = useState<StackedComponentType[]>([]);
  const stackRef = useRef<StackedComponentType[]>(stack);
  const listenersRef = useRef<ListenerType[]>([]);

  const push = useCallback((stackedComponent: StackedComponentType) => {
    const newStack = [...stackRef.current, stackedComponent];
    stackRef.current = newStack;
    setStack(newStack);
    for (const listener of listenersRef.current) {
      listener(stackedComponent, false);
    }
  }, []);

  const pop = useCallback(() => {
    const currentStack = stackRef.current;
    if (currentStack.length === 0) {
      return;
    }
    const component = currentStack[currentStack.length - 1];
    const newStack = currentStack.slice(0, -1);
    stackRef.current = newStack;
    setStack(newStack);
    for (const listener of listenersRef.current) {
      listener(component, true);
    }
  }, []);

  useKey("Escape", () => {
    if (stackRef.current.length > 0 && stackRef.current[stackRef.current.length - 1].closeOnEscape !== false) {
      pop();
    }
  });

  const popToRoot = useCallback(() => {
    stackRef.current = [];
    setStack([]);
  }, []);

  const set = useCallback((stackedComponents: StackedComponentType []) => {
    stackRef.current = stackedComponents;
    setStack(stackedComponents);
  }, []);

  const subscribe = useCallback((listener: ListenerType): (() => void) => {
    listenersRef.current = [...listenersRef.current, listener];
    return () => {
      listenersRef.current.splice(listenersRef.current.indexOf(listener), 1);
    };
  }, []);

  const renderedStack = useMemo(() => (stack.map((stackedComponentWithId, index) => {
    const isVisibleComponent = index === stack.length - 1;
    return (
      <StackedElement
        key={stackedComponentWithId.id}
        stackedComponent={stackedComponentWithId}
        visible={isVisibleComponent}
        pop={pop}
      />
    );
  })), [stack, pop]);

  return (
    <StackContext.Provider value={{ push, pop, popToRoot, set, subscribe }}>
      <Box className={style.container}>
        <Box className={`${style.content}${stack.length === 0 ? ` ${style.contentEmpty}` : ""}`}>
          {children}
        </Box>
        {renderedStack}
      </Box>
    </StackContext.Provider>
  );
}
