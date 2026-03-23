import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";


app.registerExtension(
  {
    name: "Picteus",

    async setup(app)
    {
      api.addEventListener("picteus", (event) =>
      {
        const { workflow, fileName } = event.detail;
        const file = new File([JSON.stringify(workflow)], fileName, {type: "application/json"});
        app.handleFile(file);
      }, false);
    }

  }
);
