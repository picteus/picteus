import React, { useCallback } from "react";
import { Alert, Button, Flex } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import i18n from "i18next";

import { useActionModalContext } from "app/context";


interface ConfirmOptions
{
  title: string;

  message: string;
}

export default function useConfirmAction()
{
  const [, addModal, removeModal] = useActionModalContext();

  return useCallback((onConfirm: () => void, options: ConfirmOptions) =>
  {
    const modalId = addModal({
      title: options.title,
      size: "s",
      component: <>
        <Alert icon={<IconAlertTriangle/>} color="orange">
          {options.message}
        </Alert>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button
            variant="subtle"
            onClick={() =>
            {
              removeModal(modalId);
            }}
          >
            {i18n.t("button.cancel")}
          </Button>
          <Button
            color="red"
            onClick={() =>
            {
              onConfirm();
              removeModal(modalId);
            }}
          >
            {i18n.t("button.confirm")}
          </Button>
        </Flex>
      </>
    });
  }, [addModal, removeModal]);
}
