import { Context, createContext } from "react";
import type { ViteHotContext } from "vite/types/hot.js";


// Vite's React Fast Refresh invalidates a context module whenever an unrelated file elsewhere in
// its dependency graph changes (e.g. through the "app/context" barrel), re-running createContext()
// and producing a second, disconnected context object. Consumers re-rendered on the new module
// instance then desync from the provider still mounted from the previous instance, and useContext()
// returns undefined. Stashing the instance on import.meta.hot.data survives the re-execution so the
// same context object is reused across hot reloads.
export default function createHmrStableContext<T>(hotData: ViteHotContext | undefined, key: string, defaultValue: T): Context<T>
{
  const context: Context<T> = hotData?.data[key] ?? createContext<T>(defaultValue);
  if (hotData)
  {
    hotData.data[key] = context;
  }
  return context;
}
