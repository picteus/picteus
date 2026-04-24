import { CommandSocketProvider } from "./CommandSocketContext.tsx";
import { EventSocketProvider } from "./EventSocketContext.tsx";
import { ImageVisualizerProvider } from "./ImageVisualizerContext.tsx";
import { ActionModalProvider } from "./ActionModalContext.tsx";
import { ImagesSelectedProvider } from "./ImagesSelectedContext.tsx";
import { AdditionalUiProvider } from "./AdditionalUiContext.tsx";
import { GalleryTabsProvider } from "./GalleryTabsContext.tsx";

export default function Providers({ children }) {
  return (
    <CommandSocketProvider>
      <EventSocketProvider>
        <ActionModalProvider>
            <ImageVisualizerProvider>
              <AdditionalUiProvider>
                <GalleryTabsProvider>
                  <ImagesSelectedProvider>{children}</ImagesSelectedProvider>
                </GalleryTabsProvider>
              </AdditionalUiProvider>
            </ImageVisualizerProvider>
        </ActionModalProvider>
      </EventSocketProvider>
    </CommandSocketProvider>
  );
}
