import {app} from "../../scripts/app.js";
import {api} from "../../scripts/api.js";


app.registerExtension(
  {
    name: "Picteus",

    async setup(app)
    {
      api.addEventListener("picteus", (event) =>
      {
        const workflow = event.detail;
        const blob = new Blob([JSON.stringify(workflow, undefined, 2)], {type: "application/json"});
        app.handleFile(blob);
      }, false);
    }

  }
);
