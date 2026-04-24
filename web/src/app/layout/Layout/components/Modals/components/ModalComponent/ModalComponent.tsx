import React, { ReactElement, useCallback, useEffect, useRef } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ActionIcon, Divider, Flex, Modal } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";

import { ActionModalValue } from "types";
import { useEscapeKey } from "app/hooks";
// A copy-and-paste from Mantine in order to fix a bug with the focus
import { FOCUS_SELECTOR, focusable, tabbable } from "./tabbable.ts";
import { ContentTitle } from "app/components";

import style from "./ModalComponent.module.scss";


type ModalContentType = {
  component: ReactElement;
  fullScreen: boolean;
}

function ModalContent({ component, fullScreen }: ModalContentType) {
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusRef.current !== null) {
      let cleared = false;
      const node = focusRef.current;
      let focusElement: HTMLElement | null = node.querySelector("[data-autofocus]");

      if (!focusElement) {
        const children = Array.from<HTMLElement>(node.querySelectorAll(FOCUS_SELECTOR));
        focusElement = children.find(tabbable) || children.find(focusable) || null;
        if (!focusElement && focusable(node)) {
          focusElement = node;
        }
      }
      if (!focusElement) {
        return;
      }
      const interval = setInterval(() => {
        if (document.activeElement !== focusElement) {
          focusElement.focus({ preventScroll: true });
        }
        else {
          cleared = true;
          clearInterval(interval);
        }
      }, 1_000 / 60);
      return () => {
        if (cleared === false) {
          clearInterval(interval);
        }
      };
    }
  }, [focusRef]);

  return (
    <div ref={focusRef} className={fullScreen === true ? style.contentFullScreen : style.content}>
      {fullScreen && <Divider mb="md" />}
      {component}
    </div>
  );
}

function useRememberActiveElement(shouldRemember: boolean): () => void {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (shouldRemember) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }
  }, [shouldRemember]);

  return useCallback(() => {
    if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
      previousActiveElementRef.current.focus();
    }
  }, []);
}

type ModalComponentType = {
  modal: ActionModalValue;
  onClose: (modalId: string) => void;
};

export default function ModalComponent({
  modal,
  onClose,
}: ModalComponentType) {
  const [opened, disclosureHandlers] = useDisclosure(true);
  const ref = useRef<HTMLDivElement>(null);

  const restoreFocus = useRememberActiveElement(opened);

  const handleOnClose = useCallback((viaOnSuccess: boolean): void => {
    if (modal.onBeforeClose !== undefined) {
      modal.onBeforeClose(viaOnSuccess);
    }
    restoreFocus();
    disclosureHandlers.close();
    onClose(modal.id)
  }, [modal, restoreFocus]);

  const handleOnCloseCancel = useCallback((): void => {
    handleOnClose(false);
    }, [handleOnClose]);

  useEscapeKey(ref, () => {
    if (modal.closeOnEscape !== false) {
      handleOnClose(false);
    }
  });

  function computeTitle() {
    const title = typeof modal.title === "string" ? <ContentTitle text={modal.title} icon={modal.icon} /> : modal.title;
    if (modal.fullScreen) {
      return (
        <Flex align="center" gap="md">
          <ActionIcon onClick={handleOnCloseCancel} variant="default">
            <IconChevronLeft />
          </ActionIcon>
          {title}
        </Flex>
      );
    }
    return title;
  }

  const wrappedComponent = !(modal.component.props.onSuccess !== undefined && typeof modal.component.props.onSuccess === "function") ? modal.component :React.cloneElement(modal.component, {
    onSuccess: (args) => {
      modal.component.props.onSuccess(args);
      handleOnClose(true);
    },
  });

  const classNames = ({
    ...(modal.fullScreen
      ? { content: style.modalFullScreenContent, body: style.modalFullScreenBody }
      : {}), header: style.header
  });

  return (
    <Modal
      ref={ref}
      classNames={classNames}
      stackId={modal.id}
      withinPortal={true}
      closeOnEscape={false}
      withOverlay={true}
      onClose={handleOnCloseCancel}
      trapFocus={true}
      returnFocus={false}
      opened={opened}
      fullScreen={modal.fullScreen}
      withCloseButton={modal.withCloseButton === undefined ? true : modal.withCloseButton}
      size={modal.fullScreen === true ? undefined : ((modal.size === undefined || modal.size === "auto") ? "auto" : ((modal.size === "xs" ? 30 : (modal.size === "s" ? 40 : (modal.size === "m" ? 50 : (modal.size === "l" ? 80 : 100)))) + "%"))}
      title={modal.title === undefined ? undefined : computeTitle() }
      padding="lg"
      zIndex={10}
    >
      <ModalContent component={wrappedComponent} fullScreen={modal.fullScreen} />
    </Modal>
  );
}
