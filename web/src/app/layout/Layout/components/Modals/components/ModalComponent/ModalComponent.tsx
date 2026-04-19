import React, { useEffect, useRef } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ActionIcon, Divider, Flex, Image, Modal, Text } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";

import { ActionModalValue, computeResourceTypeUrl } from "types";
import { useEscapeKey } from "app/hooks";

import style from "./ModalComponent.module.scss";


type ModalComponentType = {
  modal: ActionModalValue;
  onClose: (modalId: string) => void;
};

export default function ModalComponent({
  modal,
  onClose,
}: ModalComponentType) {
  const [opened, { open, close }] = useDisclosure(false);
  const ref = useRef<HTMLDivElement>(null);
  useEscapeKey(ref, () => {
    if (modal.closeOnEscape !== false) {
      handleOnCloseActionModal();
    }
  });

  useEffect(() => {
    open();
  }, [modal]);

  function handleOnCloseActionModal() {
    if (modal.onBeforeClose !== undefined) {
      modal.onBeforeClose();
    }
    close();
    onClose(modal.id)
  }

  function computeTitle() {
    const title = <Flex className={style.title}>
      {modal.icon && <Image src={computeResourceTypeUrl(modal.icon)} h={24} w={24} />}
      <Text size="xl" fw={700}>{modal.title}</Text>
    </Flex>;
    if (modal.fullScreen) {
      return (
        <Flex align="center" gap="md">
          <ActionIcon onClick={handleOnCloseActionModal} variant="default">
            <IconChevronLeft />
          </ActionIcon>
          {title}
        </Flex>
      );
    }
    return title;
  }

  return (
    <Modal
      ref={ref}
      classNames={
        modal.fullScreen
          ? { content: style.fullScreenContent, body: style.fullScreenBody }
          : {}
      }
      stackId={modal.id}
      withinPortal={true}
      closeOnEscape={false}
      withOverlay={true}
      onClose={handleOnCloseActionModal}
      trapFocus={true}
      returnFocus={true}
      opened={opened}
      fullScreen={modal.fullScreen}
      withCloseButton={modal.withCloseButton === undefined ? true : modal.withCloseButton}
      size={modal.fullScreen === true ? undefined : ((modal.size === undefined || modal.size === "auto") ? "auto" : ((modal.size === "xs" ? 30 : (modal.size === "s" ? 40 : (modal.size === "m" ? 50 : (modal.size === "l" ? 80 : 100)))) + "%"))}
      title={modal.title === undefined ? undefined : computeTitle() }
      padding="lg"
    >
      {modal.fullScreen && <Divider mb="md" />}
      {modal.component}
    </Modal>
  );
}
