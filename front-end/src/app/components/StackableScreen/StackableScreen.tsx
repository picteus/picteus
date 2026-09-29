import { ReactElement, ReactNode, useEffect } from "react";

import { ActionModalValue } from "types";
import { ActionModalProvider, useActionModalContext } from "app/context";
import { StackNavigator, useStackNavigator } from "app/components";


export interface StackableScreenPropsType
{
  children: ReactNode;
  resetTrigger?: unknown;
  className?: string;
}

interface StackableScreenBridgePropsType
{
  children: ReactNode;
  parentAddModal: (value: ActionModalValue) => string;
  parentRemoveModal: (id: string) => void;
  resetTrigger?: unknown;
  className?: string;
}

function StackableScreenBridge({
  children,
  parentAddModal,
  parentRemoveModal,
  resetTrigger,
  className
}: StackableScreenBridgePropsType): ReactNode
{
  const [ , , removeModal, subscribeToModals ] = useActionModalContext();
  const { push, pop, popToRoot, subscribe } = useStackNavigator();

  useEffect(() =>
  {
    return subscribeToModals((value: ActionModalValue, isAdded: boolean) =>
    {
      if (value.isStackable !== true)
      {
        if (isAdded === true)
        {
          parentAddModal(value);
        }
        else
        {
          parentRemoveModal(value.id);
        }
        return;
      }
      if (isAdded === true)
      {
        push(value);
      }
      else
      {
        pop();
      }
    });
  }, [ parentAddModal, parentRemoveModal, subscribeToModals, push, pop ]);

  useEffect(() =>
  {
    return subscribe((stackedComponent, isPopped: boolean) =>
    {
      if (isPopped === true)
      {
        removeModal(stackedComponent.id);
      }
    });
  }, [ subscribe, removeModal ]);

  useEffect(() =>
  {
    popToRoot();
  }, [ resetTrigger, popToRoot ]);

  if (className)
  {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return children;
}

export default function StackableScreen({
  children,
  resetTrigger,
  className
}: StackableScreenPropsType): ReactElement
{
  const [ , addModal, removeModal ] = useActionModalContext();

  return (
    <ActionModalProvider>
      <StackNavigator>
        <StackableScreenBridge
          parentAddModal={addModal}
          parentRemoveModal={removeModal}
          resetTrigger={resetTrigger}
          className={className}
        >
          {children}
        </StackableScreenBridge>
      </StackNavigator>
    </ActionModalProvider>
  );
}
