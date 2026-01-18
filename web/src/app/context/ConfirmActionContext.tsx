import { createContext, ReactNode, useContext, useState } from "react";
import i18n from "i18next";
import { Alert, Button, Flex, Modal, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface ConfirmActionContextProps {
  confirmAction: (onConfirm: () => void, options: ConfirmOptions) => void;
}
interface ConfirmOptions {
  title: string;
  message: string;
}

const ConfirmActionContext = createContext<
  ConfirmActionContextProps | undefined
>(undefined);

export const ConfirmActionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [onConfirmCallback, setOnConfirmCallback] = useState<() => void>(
    () => {},
  );
  const [modalOptions, setModalOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });

  function confirmAction(onConfirm: () => void, options: ConfirmOptions) {
    setOnConfirmCallback(() => onConfirm);
    setConfirmModalOpen(true);
    setModalOptions(options || { title: "", message: "" });
  }

  return (
    <ConfirmActionContext.Provider value={{ confirmAction }}>
      {children}
      <Modal
        opened={isConfirmModalOpen}
        size="lg"
        onClose={() => setConfirmModalOpen(false)}
        title={<Title order={3}>{modalOptions.title}</Title>}
      >
        <Alert icon={<IconAlertTriangle />} color="orange">
          {modalOptions.message}
        </Alert>
        <Flex justify="flex-end">
          <Button
            mt="lg"
            color="red"
            onClick={() => {
              onConfirmCallback();
              setConfirmModalOpen(false);
            }}
          >
            {i18n.t("button.confirm")}
          </Button>
        </Flex>
      </Modal>
    </ConfirmActionContext.Provider>
  );
};

export function useConfirmAction() {
  return useContext(ConfirmActionContext).confirmAction;
}
