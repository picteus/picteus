import React, { useEffect, useRef } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ActionIcon, Divider, Flex, Image, Modal, Text } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";

import { ActionModalValue, computeResourceTypeUrl } from "types";
import { useEscapeKey } from "app/hooks";

import style from "./ModalComponent.module.scss";


type ModalComponentType = {
  modal: ActionModalValue;
  onCloseActionModal: (modalId: string) => void;
};

export default function ModalComponent({
  modal,
  onCloseActionModal,
}: ModalComponentType) {
  const [actionModalOpened, { open: openActionModal, close: closeActionModal }] = useDisclosure(false);
  const ref = useRef<HTMLDivElement>(null);
  useEscapeKey(ref, () => {
    if (modal.closeOnEscape !== false) {
      handleOnCloseActionModal();
    }
  });

  useEffect(() => {
    openActionModal();
  }, [modal]);

  function handleOnCloseActionModal() {
    if (modal.onBeforeClose !== undefined) {
      modal.onBeforeClose();
    }
    closeActionModal();
    onCloseActionModal(modal.id);
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

  const WrappedComponent = React.cloneElement(modal.component, {
    onClose: () => {
      if (modal.component.props.onClose) {
        modal.component.props.onClose();
      }
      handleOnCloseActionModal();
    },
  });

  return (
    <Modal
      ref={ref}
      classNames={
        modal.fullScreen
          ? { content: style.fullScreenContent, body: style.fullScreenBody }
          : {}
      }
      withinPortal={false}
      closeOnEscape={false}
      onClose={handleOnCloseActionModal}
      opened={actionModalOpened}
      fullScreen={modal.fullScreen}
      size={modal.fullScreen === true ? undefined : ((modal.size === undefined || modal.size === "auto") ? "auto" : ((modal.size === "xs" ? 30 : (modal.size === "s" ? 40 : (modal.size === "m" ? 50 : (modal.size === "l" ? 80 : 100)))) + "%"))}
      title={modal.title === undefined ? undefined : computeTitle() }
      withCloseButton={modal.withCloseButton === undefined ? true : modal.withCloseButton}
      padding="lg"
    >
      {modal.fullScreen && <Divider mb="md" />}
      {WrappedComponent}
    </Modal>
  );
}
