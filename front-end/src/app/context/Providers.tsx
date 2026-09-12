import { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient, SocketCacheSync } from "app/query";
import { CommandSocketProvider } from "./CommandSocketContext.tsx";
import { EventSocketProvider } from "./EventSocketContext.tsx";
import { ActionModalProvider } from "./ActionModalContext.tsx";
import { ImagesSelectedProvider } from "./ImagesSelectedContext.tsx";
import { AdditionalUiProvider } from "./AdditionalUiContext.tsx";
import { ImagesTabsProvider } from "./ImagesTabsContext.tsx";


export default function Providers({ children }: { children?: ReactNode })
{
  return (
    <QueryClientProvider client={queryClient}>
      <CommandSocketProvider>
        <EventSocketProvider>
          <SocketCacheSync/>
          <ActionModalProvider>
            <AdditionalUiProvider>
              <ImagesTabsProvider>
                <ImagesSelectedProvider>{children}</ImagesSelectedProvider>
              </ImagesTabsProvider>
            </AdditionalUiProvider>
          </ActionModalProvider>
        </EventSocketProvider>
      </CommandSocketProvider>
    </QueryClientProvider>
  );
}
