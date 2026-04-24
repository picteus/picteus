import React from "react";
import { Alert, Button, Flex } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
import i18n from "i18next";

import { useActionModalContext } from "app/context";


interface ConfirmOptions {
  title: string;
  message: string;
}

export default function useConfirmAction() {
  const [, addModal, removeModal] = useActionModalContext();
  function confirmAction(onConfirm: () => void, options: ConfirmOptions) {
    const modalId = randomId();
    addModal({
      id:modalId,
      title: options.title,
      size: "s",
      component: <>
        <Alert icon={<IconAlertTriangle />} color="orange">
          {options.message}
        </Alert>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button
            variant="subtle"
            onClick={() => {
              removeModal(modalId);
            }}
          >
            {i18n.t("button.cancel")}
          </Button>
          <Button
            color="red"
            onClick={() => {
              onConfirm();
              removeModal(modalId);
            }}
          >
            {i18n.t("button.confirm")}
          </Button>
        </Flex>
      </>
    });
  }

  return confirmAction;
}
