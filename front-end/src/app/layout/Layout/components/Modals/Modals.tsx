import React, { useMemo } from "react";

import { ActionModalValue } from "types";
import { useActionModalContext } from "app/context";
import { ModalComponent } from "./components";


export default function Modals() {
  const [modals, , removeModal] = useActionModalContext();

  function onCloseActionModal(modalId: string): void {
    removeModal(modalId);
  }

  return useMemo(() =>
    modals.map((modal: ActionModalValue) => (<ModalComponent
        key={`modal-${modal.id}`}
        modal={modal}
        onClose={onCloseActionModal}
      />)
    ), [modals])
}
