import { useEffect, useState } from "react";
import { Bounce, ToastContainer } from "react-toastify";

import Router from "app/routes/Router";
import { ApplicationService } from "app/services";
import Providers from "app/context";

export default function Initializer() {
  const [initialized, setInitialized] = useState(false);

  async function load() {
    try {
      await ApplicationService.initialize();
      setInitialized(true);
      console.debug("Application initialized");
    } catch (error) {
      console.error(
        "Error calling the application initialization method, retrying...",
        error,
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return initialized ? (
    <Providers>
      <ToastContainer
        position="bottom-center"
        autoClose={3000}
        newestOnTop
        hideProgressBar
        closeOnClick
        rtl={false}
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
      <Router />
    </Providers>
  ) : (
    <></>
  );
}
