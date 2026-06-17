import { CommandSocketProvider } from "./CommandSocketContext.tsx";
import { EventSocketProvider } from "./EventSocketContext.tsx";
import { ActionModalProvider } from "./ActionModalContext.tsx";
import { ImagesSelectedProvider } from "./ImagesSelectedContext.tsx";
import { AdditionalUiProvider } from "./AdditionalUiContext.tsx";
import { ImagesTabsProvider } from "./ImagesTabsContext.tsx";


export default function Providers({ children })
{
  return (
    <CommandSocketProvider>
      <EventSocketProvider>
        <ActionModalProvider>
          <AdditionalUiProvider>
            <ImagesTabsProvider>
              <ImagesSelectedProvider>{children}</ImagesSelectedProvider>
            </ImagesTabsProvider>
          </AdditionalUiProvider>
        </ActionModalProvider>
      </EventSocketProvider>
    </CommandSocketProvider>
  );
}
