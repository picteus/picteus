import React, { useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ActionIcon, Divider, Flex, Modal, Title } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";

import { ActionModalValue } from "types";
import style from "./ModalComponent.module.scss";

export default function ModalComponent({
  modal,
  onCloseActionModal,
}: {
  modal: ActionModalValue;
  onCloseActionModal: (modalId: string) => void;
}) {
  const [
    actionModalOpened,
    { open: openActionModal, close: closeActionModal },
  ] = useDisclosure(false);

  useEffect(() => {
    if (modal?.component) {
      openActionModal();
    }
  }, [modal]);

  function handleOnCloseActionModal() {
    if (modal?.onBeforeClose) {
      modal.onBeforeClose();
    }
    closeActionModal();
    onCloseActionModal(modal.id);
  }

  function computeTitle() {
    if (modal.fullScreen) {
      return (
        <Flex align="center" gap="md">
          <ActionIcon onClick={handleOnCloseActionModal} variant="default">
            <IconChevronLeft />
          </ActionIcon>
          <Title order={3}>{modal.title}</Title>
        </Flex>
      );
    }
    return <Title order={3}>{modal.title}</Title>;
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
      classNames={
        modal.fullScreen
          ? { content: style.fullScreenContent, body: style.fullScreenBody }
          : {}
      }
      closeOnEscape={false}
      withinPortal={false}
      onClose={handleOnCloseActionModal}
      opened={actionModalOpened}
      fullScreen={modal.fullScreen}
      size="xl"
      {...(modal.title
        ? { title: computeTitle() }
        : { withCloseButton: false })}
      padding="lg"
    >
      {modal.fullScreen && <Divider mb="md" />}
      {WrappedComponent}
    </Modal>
  );
}
