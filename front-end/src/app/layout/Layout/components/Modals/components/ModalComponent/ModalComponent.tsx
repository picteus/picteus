import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { randomId, useDisclosure } from "@mantine/hooks";
import { ActionIcon, Box, Button, Flex, Modal, ScrollArea } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";

import { ActionModalValue } from "types";
import { ModalContext, ModalContextType } from "app/context";
import { useEscapeKey } from "app/hooks";
// A copy-and-paste from Mantine in order to fix a bug with the focus
import { FOCUS_SELECTOR, focusable, tabbable } from "./tabbable.ts";
import { ContentTitle } from "app/components";

import style from "./ModalComponent.module.scss";


type ModalChildType = {
  component: ReactNode;
  fullScreen: boolean;
};

function ModalChild({ component, fullScreen }: ModalChildType)
{
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() =>
  {
    if (focusRef.current !== null)
    {
      let cleared = false;
      const node = focusRef.current;
      let focusElement: HTMLElement | null = node.querySelector("[data-autofocus]");

      if (!focusElement)
      {
        const children = Array.from<HTMLElement>(node.querySelectorAll(FOCUS_SELECTOR));
        focusElement = children.find(tabbable) || children.find(focusable) || null;
        if (!focusElement && focusable(node))
        {
          focusElement = node;
        }
      }
      if (!focusElement)
      {
        return;
      }
      const interval = setInterval(() =>
      {
        if (document.activeElement !== focusElement)
        {
          focusElement.focus({ preventScroll: true });
        }
        else
        {
          cleared = true;
          clearInterval(interval);
        }
      }, 1_000 / 60);
      return () =>
      {
        if (cleared === false)
        {
          clearInterval(interval);
        }
      };
    }
  }, [ focusRef ]);

  return (
    <Box ref={focusRef} h={fullScreen ? "100%" : undefined}>
      {component}
    </Box>
  );
}

function useRememberActiveElement(shouldRemember: boolean): () => void
{
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() =>
  {
    if (shouldRemember)
    {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }
  }, [ shouldRemember ]);

  return useCallback(() =>
  {
    if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function")
    {
      previousActiveElementRef.current.focus();
    }
  }, []);
}

type ModalComponentType = {
  modal: ActionModalValue;
  onClose: (modalId: string) => void;
};

export default function ModalComponent({ modal, onClose }: ModalComponentType)
{
  const [ opened, disclosureHandlers ] = useDisclosure(true);
  const ref = useRef<HTMLDivElement>(null);
  const [ footerElement, setFooterElement ] = useState<HTMLDivElement | null>(null);
  const [ hasPortaledActions, setHasPortaledActions ] = useState<boolean>(false);
  const modalId = modal.id ?? randomId();

  const restoreFocus = useRememberActiveElement(opened);

  const handleOnClose = useCallback((viaOnSuccess: boolean): void =>
    {
      if (modal.onBeforeClose !== undefined)
      {
        modal.onBeforeClose(viaOnSuccess);
      }
      restoreFocus();
      disclosureHandlers.close();
      onClose(modalId);
    },
    [ modal, restoreFocus, onClose, disclosureHandlers ]
  );

  const handleOnCloseCancel = useCallback((): void =>
  {
    handleOnClose(false);
  }, [ handleOnClose ]);

  useEscapeKey(ref, () =>
  {
    if (modal.closeOnEscape !== false)
    {
      handleOnClose(false);
    }
  });

  const fullScreen = modal.fullScreen;

  function computeTitle(): ReactNode
  {
    const title = typeof modal.title === "string" ? (
      <ContentTitle
        text={modal.title}
        icon={modal.icon}
        details={modal.subtitle}
      />
    ) : modal.title;
    if (fullScreen)
    {
      return (
        <Flex align="center" gap="md">
          <ActionIcon onClick={handleOnCloseCancel} variant="default">
            <IconChevronLeft/>
          </ActionIcon>
          {title}
        </Flex>
      );
    }
    return title;
  }

  const modalContextValue = useMemo<ModalContextType>(() => ({
      modalId,
      closeModal: (viaOnSuccess = false) => handleOnClose(viaOnSuccess),
      footerElement,
      hasPortaledActions,
      setHasPortaledActions
    }),
    [ modalId, handleOnClose, footerElement, hasPortaledActions ]
  );

  function renderStaticActions(): ReactNode
  {
    if (!modal.actions)
    {
      return null;
    }
    return (
      <Flex justify="flex-end" gap="sm" align="center" w="100%">
        {modal.actions.map((action, index) =>
        {
          return (
            <Button
              key={`action-${index}`}
              variant={index !== (modal.actions.length - 1) ? "subtle" : undefined}
              color={action.color}
              type="button"
              onClick={() =>
              {
                if (action.onClick)
                {
                  void action.onClick(() => handleOnClose(true));
                }
                else
                {
                  handleOnClose(true);
                }
              }}
            >
              {action.label}
            </Button>
          );
        })}
      </Flex>
    );
  }

  const classNames = {
    content: `${style.content}${fullScreen ? ` ${style.contentFullScreen}` : ""}`,
    body: `${style.body}${fullScreen ? ` ${style.bodyFullScreen}` : ""}`,
    header: style.header
  };
  const size = fullScreen === true ? undefined : ((modal.size === undefined || modal.size === "auto") ? "auto" : ((modal.size === "xs" ? 30 : (modal.size === "s" ? 40 : (modal.size === "m" ? 50 : (modal.size === "l" ? 80 : 100)))) + "%"));

  return (
    <Modal
      ref={ref}
      classNames={classNames}
      stackId={modalId}
      withinPortal={true}
      closeOnEscape={false}
      withOverlay={true}
      onClose={handleOnCloseCancel}
      trapFocus={true}
      returnFocus={false}
      opened={opened}
      fullScreen={fullScreen}
      withCloseButton={modal.withCloseButton ?? true}
      size={size}
      title={modal.title === undefined ? undefined : computeTitle()}
      zIndex={10}
    >
      <ModalContext.Provider value={modalContextValue}>
        <ScrollArea
          flex={1}
          mih={0}
          h={fullScreen ? "100%" : undefined}
          p={fullScreen ? 0 : "md"}
          offsetScrollbars
          scrollbars="y"
        >
          <ModalChild component={modal.body} fullScreen={fullScreen}/>
        </ScrollArea>
        <Box
          ref={setFooterElement}
          p="md"
          bg="var(--mantine-color-body)"
          className={style.footer}
        >
          {!hasPortaledActions && renderStaticActions()}
        </Box>
      </ModalContext.Provider>
    </Modal>
  );
}
