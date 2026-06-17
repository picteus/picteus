import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Affix, Button, HoverCard, Transition } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "utils";
import { useImagesSelectedContext } from "app/context";
import { SelectedImages } from "../index.ts";

import style from "./SelectedImagesAffix.module.scss";


export default function SelectedImagesAffix()
{
  const [t] = useTranslation();
  const location = useLocation();
  const { selectedImages } = useImagesSelectedContext();
  const [isProcessing, setIsProcessing] = useState(false);

  function shouldAffixBeVisible()
  {
    return location.pathname === ROUTES.home && selectedImages?.length >= 1 && isProcessing === false;
  }

  return (
    <Affix className={style.container} classNames={{ root: style.root }}>
      <Transition transition="slide-up" mounted={shouldAffixBeVisible()}>
        {(transitionStyles) => (
          <HoverCard
            withinPortal={false}
            position="top-end"
            shadow="lg"
            withArrow
            closeDelay={200}
          >
            <HoverCard.Target>
              <Button
                className={style.affixButton}
                variant={"gradient"}
                size="lg"
                style={transitionStyles}
                rightSection={<IconPhoto size={23}/>}
              >
                {selectedImages?.length}{" "}
                {t("selectedImages.buttonLabelWithCount", {
                  count: selectedImages?.length
                })}
              </Button>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <SelectedImages onProcessing={setIsProcessing}/>
            </HoverCard.Dropdown>
          </HoverCard>
        )}
      </Transition>
    </Affix>
  );
}
