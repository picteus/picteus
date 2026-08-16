import { useEffect, useState } from "react";

import AppRouter from "app/routes/Router";
import { ApplicationService } from "app/services";


export default function Initializer()
{
  const [ initialized, setInitialized ] = useState(false);

  async function load()
  {
    try
    {
      await ApplicationService.initialize();
      setInitialized(true);
      console.debug("Application initialized");
    }
    catch (error)
    {
      console.error("Error calling the application initialization method, retrying...", error);
    }
  }

  useEffect(() =>
  {
    void load();
  }, []);

  return initialized ? (<AppRouter/>) : (<></>);
}
