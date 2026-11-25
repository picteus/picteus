import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { randomId, useDisclosure } from "@mantine/hooks";
import { ActionIcon, Box, Button, Divider, Flex, Modal, ScrollArea, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import { ActionModalValue } from "types";
import { ModalCloseGuardType, ModalContext, ModalContextType, ModalOverlayConfigType } from "app/context";
import { useEscapeKey } from "app/hooks";
// A copy-and-paste from Mantine in order to fix a bug with the focus
import { FOCUS_SELECTOR, focusable, tabbable } from "./tabbable.ts";
import { Common, ContentTitle } from "app/components";

import style from "./ModalComponent.module.scss";


type ModalChildType = {
  component: ReactNode;
  fullScreen: boolean;
  isPadded: boolean;
  isHidden: boolean;
};

type ActiveOverlayType = {
  readonly id: number;
  readonly config: ModalOverlayConfigType;
};

type ModalOverlaySurfaceType = {
  readonly modalId: string;
  readonly overlay: ActiveOverlayType;
  readonly isFullScreen: boolean;
  readonly requestCloseRef: RefObject<(() => void) | null>;
  readonly onHasPortaledActionsChange: (hasActions: boolean) => void;
  readonly onClose: (overlayId: number, viaOnSuccess: boolean) => void;
};

function ModalChild({ component, fullScreen, isPadded, isHidden }: ModalChildType): ReactElement
{
  const focusRef = useRef<HTMLDivElement>(null);
  const hasAutoFocusedRef = useRef<boolean>(false);

  useEffect(() =>
  {
    if (isHidden === true || hasAutoFocusedRef.current === true)
    {
      return;
    }
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
          hasAutoFocusedRef.current = true;
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
  }, [ focusRef, isHidden ]);

  return (
    <Box ref={focusRef} h={fullScreen ? "100%" : undefined} p={isPadded ? "md" : undefined}>
      {component}
    </Box>
  );
}

function ModalOverlaySurface({
  modalId,
  overlay,
  isFullScreen,
  requestCloseRef,
  onHasPortaledActionsChange,
  onClose
}: ModalOverlaySurfaceType): ReactElement
{
  const closeGuardRef = useRef<ModalCloseGuardType | undefined>(undefined);
  const [ errorElement, setErrorElement ] = useState<HTMLDivElement | null>(null);
  const [ footerElement, setFooterElement ] = useState<HTMLDivElement | null>(null);
  const [ hasPortaledActions, setHasPortaledActions ] = useState<boolean>(false);

  useEffect(() =>
  {
    onHasPortaledActionsChange(hasPortaledActions);
    return (): void =>
    {
      onHasPortaledActionsChange(false);
    };
  }, [ hasPortaledActions, onHasPortaledActionsChange ]);

  const handleClose = useCallback((viaOnSuccess = false): void =>
  {
    onClose(overlay.id, viaOnSuccess);
  }, [ onClose, overlay.id ]);

  const setCloseGuard = useCallback((guard: ModalCloseGuardType | undefined): void =>
  {
    closeGuardRef.current = guard;
  }, []);

  const requestClose = useCallback((): void =>
  {
    if (closeGuardRef.current !== undefined)
    {
      closeGuardRef.current(() => handleClose(false));
      return;
    }
    handleClose(false);
  }, [ handleClose ]);

  useEffect(() =>
  {
    requestCloseRef.current = requestClose;
    return (): void =>
    {
      if (requestCloseRef.current === requestClose)
      {
        requestCloseRef.current = null;
      }
    };
  }, [ requestClose, requestCloseRef ]);

  const overlayContextValue = useMemo<ModalContextType>(() => ({
    modalId: `${modalId}-overlay-${overlay.id}`,
    closeModal: handleClose,
    requestClose,
    setCloseGuard,
    errorElement,
    footerElement,
    hasPortaledActions,
    setHasPortaledActions,
    isOverlayActive: false,
    openOverlay: undefined
  }), [ modalId, overlay.id, handleClose, requestClose, setCloseGuard, errorElement, footerElement, hasPortaledActions ]);

  return (
    <ModalContext.Provider value={overlayContextValue}>
      <Box
        className={`${style.overlayLayer}${hasPortaledActions === true ? ` ${style.overlayLayerFullBody}` : ""}`}
        bg="var(--mantine-color-body)"
      >
        {overlay.config.title !== undefined && (
          <>
            <Flex
              align="center"
              px="md"
              py={10}
              gap="sm"
              miw={0}
              maw="100%"
              flex="0 0 auto"
              bg="var(--mantine-color-body)"
            >
              <ActionIcon
                variant="default"
                size={28}
                radius={5}
                flex="0 0 auto"
                onClick={() => handleClose(false)}
              >
                <IconArrowLeft size={16} stroke={Common.IconStrokeSize}/>
              </ActionIcon>
              <Text size="md" fw={500} truncate="end" miw={0} flex={1}>
                {overlay.config.title}
              </Text>
            </Flex>
            <Divider/>
          </>
        )}
        <ScrollArea
          className={style.scrollArea}
          flex={1}
          mih={0}
          h="100%"
          type="auto"
          offsetScrollbars="present"
          scrollbars="y"
        >
          <ModalChild
            component={overlay.config.content}
            fullScreen={true}
            isPadded={!isFullScreen}
            isHidden={false}
          />
        </ScrollArea>
        <Box
          ref={setErrorElement}
          bg="var(--mantine-color-body)"
          className={style.error}
        />
        <Box
          ref={setFooterElement}
          bg="var(--mantine-color-body)"
          className={style.footer}
        />
      </Box>
    </ModalContext.Provider>
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

export default function ModalComponent({ modal, onClose }: ModalComponentType): ReactElement
{
  const [ opened, disclosureHandlers ] = useDisclosure(true);
  const ref = useRef<HTMLDivElement>(null);
  const closeGuardRef = useRef<ModalCloseGuardType | undefined>(undefined);
  const nextOverlayIdRef = useRef<number>(0);
  const activeOverlayRef = useRef<ActiveOverlayType | null>(null);
  const overlayRequestCloseRef = useRef<(() => void) | null>(null);
  const overlayReturnFocusRef = useRef<HTMLElement | null>(null);
  const [ errorElement, setErrorElement ] = useState<HTMLDivElement | null>(null);
  const [ footerElement, setFooterElement ] = useState<HTMLDivElement | null>(null);
  const [ hasPortaledActions, setHasPortaledActions ] = useState<boolean>(false);
  const [ overlayHasPortaledActions, setOverlayHasPortaledActions ] = useState<boolean>(false);
  const [ activeOverlay, setActiveOverlay ] = useState<ActiveOverlayType | null>(null);
  const modalId = modal.id ?? randomId();

  const restoreFocus = useRememberActiveElement(opened);

  const closeOverlayById = useCallback((overlayId: number, viaOnSuccess: boolean): void =>
  {
    const current = activeOverlayRef.current;
    if (current === null || current.id !== overlayId)
    {
      return;
    }
    activeOverlayRef.current = null;
    overlayRequestCloseRef.current = null;
    setActiveOverlay(null);
    if (viaOnSuccess === false)
    {
      current.config.onCancel?.();
    }
  }, []);

  const openOverlay = useCallback((config: ModalOverlayConfigType): (() => void) =>
  {
    if (activeOverlayRef.current !== null)
    {
      console.warn("ModalComponent: ignoring openOverlay() because an overlay is already active.");
      return (): void =>
      {
        // No-op when an overlay is already active
      };
    }

    const overlayId = nextOverlayIdRef.current + 1;
    nextOverlayIdRef.current = overlayId;

    const activeElement = document.activeElement;
    overlayReturnFocusRef.current =
      activeElement instanceof HTMLElement && ref.current !== null && ref.current.contains(activeElement)
        ? activeElement
        : null;

    const nextOverlay: ActiveOverlayType = { id: overlayId, config };
    activeOverlayRef.current = nextOverlay;
    setActiveOverlay(nextOverlay);

    return (): void =>
    {
      closeOverlayById(overlayId, true);
    };
  }, [ closeOverlayById ]);

  const hasOverlay = activeOverlay !== null;
  const previousHasOverlayRef = useRef<boolean>(false);

  useEffect(() =>
  {
    const hadOverlay = previousHasOverlayRef.current;
    previousHasOverlayRef.current = hasOverlay;
    if (hadOverlay === true && hasOverlay === false)
    {
      const elementToRestore = overlayReturnFocusRef.current;
      overlayReturnFocusRef.current = null;
      if (elementToRestore !== null && elementToRestore.isConnected === true && typeof elementToRestore.focus === "function")
      {
        elementToRestore.focus();
      }
    }
  }, [ hasOverlay ]);

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
    [ modal, restoreFocus, onClose, disclosureHandlers, modalId ]
  );

  const setCloseGuard = useCallback((guard: ModalCloseGuardType | undefined): void =>
  {
    closeGuardRef.current = guard;
  }, []);

  const requestClose = useCallback((): void =>
  {
    if (closeGuardRef.current !== undefined)
    {
      closeGuardRef.current(() => handleOnClose(false));
      return;
    }
    handleOnClose(false);
  }, [ handleOnClose ]);

  useEscapeKey(ref, () =>
  {
    if (activeOverlayRef.current !== null)
    {
      overlayRequestCloseRef.current?.();
      return;
    }
    if (modal.closeOnEscape !== false)
    {
      requestClose();
    }
  });

  const isFullScreen = modal.isFullScreen === true;
  const isFullHeight = isFullScreen === false && modal.isFullHeight === true;

  function computeTitle(): ReactNode
  {
    if (typeof modal.title === "string")
    {
      return (
        <ContentTitle
          text={modal.title}
          icon={modal.icon}
          details={modal.subtitle}
        />
      );
    }
    return (
      <>
        {modal.title}
        <Divider pos="absolute" left={0} right={0} bottom={0}/>
      </>
    );
  }

  const modalContextValue = useMemo<ModalContextType>(() => ({
      modalId,
      closeModal: (viaOnSuccess = false) => handleOnClose(viaOnSuccess),
      requestClose,
      setCloseGuard,
      errorElement,
      footerElement,
      hasPortaledActions,
      setHasPortaledActions,
      isOverlayActive: hasOverlay,
      openOverlay
    }),
    [ modalId, handleOnClose, requestClose, setCloseGuard, errorElement, footerElement, hasPortaledActions, hasOverlay, openOverlay ]
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
              disabled={hasOverlay === true}
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
    content: `${style.content}${isFullScreen ? ` ${style.contentFullScreen}` : ""}${isFullHeight ? ` ${style.contentFullHeight}` : ""}`,
    body: `${style.body}${isFullScreen ? ` ${style.bodyFullScreen}` : ""}`,
    header: style.header,
    title: style.title
  };

  function computeModalSize(): string | undefined
  {
    if (isFullScreen === true)
    {
      return undefined;
    }
    if (modal.size === undefined || modal.size === "auto")
    {
      return "auto";
    }
    const percentage = modal.size === "xs" ? 30 : (modal.size === "s" ? 40 : (modal.size === "m" ? 50 : (modal.size === "l" ? 80 : 100)));
    return `${percentage}%`;
  }

  const size = computeModalSize();

  return (
    <ModalContext.Provider value={modalContextValue}>
      <Modal
        ref={ref}
        classNames={classNames}
        stackId={modalId}
        withinPortal={true}
        closeOnEscape={false}
        withOverlay={true}
        onClose={requestClose}
        trapFocus={true}
        returnFocus={false}
        opened={opened}
        fullScreen={isFullScreen}
        withCloseButton={modal.withCloseButton ?? true}
        size={size}
        title={modal.title !== undefined ? computeTitle() : undefined}
        zIndex={10}
      >
        <div
          className={`${style.surface}${hasOverlay === true ? ` ${style.surfaceHidden}` : ""}`}
          inert={hasOverlay}
          aria-hidden={hasOverlay || undefined}
        >
          <ScrollArea
            className={style.scrollArea}
            flex={1}
            mih={0}
            h="100%"
            type="auto"
            offsetScrollbars="present"
            scrollbars="y"
          >
            <ModalChild
              component={modal.body}
              fullScreen={isFullScreen || isFullHeight}
              isPadded={!isFullScreen}
              isHidden={hasOverlay}
            />
          </ScrollArea>
          <Box
            ref={setErrorElement}
            bg="var(--mantine-color-body)"
            className={style.error}
          />
        </div>
        <Box
          ref={setFooterElement}
          bg="var(--mantine-color-body)"
          className={style.footer}
          inert={overlayHasPortaledActions}
          aria-hidden={overlayHasPortaledActions || undefined}
        >
          {!hasPortaledActions && renderStaticActions()}
        </Box>
        {activeOverlay !== null && (
          <ModalOverlaySurface
            modalId={modalId}
            overlay={activeOverlay}
            isFullScreen={isFullScreen}
            requestCloseRef={overlayRequestCloseRef}
            onHasPortaledActionsChange={setOverlayHasPortaledActions}
            onClose={closeOverlayById}
          />
        )}
      </Modal>
    </ModalContext.Provider>
  );
}
