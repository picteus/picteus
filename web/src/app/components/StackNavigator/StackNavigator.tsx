import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Box, Flex, Title } from "@mantine/core";
import { useFocusTrap } from "@mantine/hooks";
import { IconArrowLeft, IconX } from "@tabler/icons-react";

import { ActionModalValue } from "types";

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
        <ActionIcon variant="default" onClick={pop}>
          <IconX stroke={1.2} size={50} />
        </ActionIcon>
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
  const listenersRef = useRef<ListenerType[]>([]);

  const push = useCallback((stackedComponent: StackedComponentType) => {
    setStack((previousStack) => [...previousStack, stackedComponent]);
    for (const listener of listenersRef.current) {
      listener(stackedComponent, false);
    }
  }, []);

  const pop = useCallback(() => {
    setStack((previousStack) => {
      if (previousStack.length === 0) {
        return previousStack;
      }
      const newStack = previousStack.slice(0, -1);
      for (const listener of listenersRef.current) {
        listener(previousStack[previousStack.length - 1], true);
      }
      return newStack;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && stack.length > 0 && stack[stack.length - 1].closeOnEscape !== false) {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pop, stack]);

  const popToRoot = useCallback(() => {
    setStack([]);
  }, []);

  const set = useCallback((stackedComponents: StackedComponentType []) => {
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
