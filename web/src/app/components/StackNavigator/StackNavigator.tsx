import React, { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { ActionIcon, Box, Flex, Title } from "@mantine/core";
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

interface StackNavigatorType {
  children: ReactNode;
}

export default function StackNavigator ({ children }:StackNavigatorType) {
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
      const newStack = previousStack.slice(0, -1);
      for (const listener of listenersRef.current) {
        listener(previousStack[previousStack.length - 1], true);
      }
      return newStack;
    });
  }, []);

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
    const hasTopBar = stackedComponentWithId.fullScreen !== true;
    return (
      <Flex
        key={stackedComponentWithId.id}
        className={`${style.stack}${isVisibleComponent ? "" : ` ${style.stackHidden}`}`}
        direction="column"
      >
        {hasTopBar && <Flex align="center" p="md" gap="md" className={style.topBar}>
          <ActionIcon variant="default" onClick={pop}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          {stackedComponentWithId.title && (
            <Title order={4} style={{ flex: 1 }}>
              {stackedComponentWithId.title}
            </Title>
          )}
          <ActionIcon variant="default" onClick={pop}>
            <IconX stroke={1.2} size={50} />
          </ActionIcon>
        </Flex>}
        <Box flex={1} className={style.componentWrapper}>
          {stackedComponentWithId.component}
        </Box>
      </Flex>
    );
  })), [stack]);

  const isStackEmpty = stack.length === 0;
  return (
    <StackContext.Provider value={{ push, pop, popToRoot, set, subscribe }}>
      <Box className={style.container}>
        <Box className={`${style.content}${isStackEmpty ? ` ${style.contentEmpty}` : ""}`}>
          {children}
        </Box>
        {renderedStack}
      </Box>
    </StackContext.Provider>
  );
}
