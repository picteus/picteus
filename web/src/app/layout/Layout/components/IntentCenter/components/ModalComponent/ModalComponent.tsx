import React, { useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ActionIcon, Divider, Flex, Image, Modal, Title } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";

import { ActionModalValue, computeResourceTypeUrl } from "types";
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
    const title = <Title className={style.title} order={3}>{modal.icon &&
      <Image src={computeResourceTypeUrl(modal.icon)} h={24} w={24} />}{modal.title}</Title>;
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
      classNames={
        modal.fullScreen
          ? { content: style.fullScreenContent, body: style.fullScreenBody }
          : {}
      }
      closeOnEscape={true}
      withinPortal={false}
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
