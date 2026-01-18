const path = require("path");
const fs = require("fs");

// @ts-ignore
const { io } = require("${nodeModulesDirectoryPath}/socket.io-client");


async function main()
{
  const directoryPath = ".";
  const parameters = JSON.parse(fs.readFileSync(path.join(directoryPath, "parameters.json"), { encoding: "utf8" }));
  console.info(`The extension with id '${parameters.extensionId}' has started`);
  const options =
    {
      autoConnect: true,
      transports: ["websocket"],
      rejectUnauthorized: false
    };
  const ioClient = io(parameters.webServicesBaseUrl, options);
  const commonParameters = { apiKey: parameters.apiKey, extensionId: parameters.extensionId };
  // @ts-ignore
  ioClient.on("events", ({ channel, contextId, value }, onResult) =>
    {
      console.info(`Received at '${Date.now()}' an event on channel '${channel}'`);
      const filePath = path.join(directoryPath, channel);
      console.info(`Writing to file '${filePath}'`);
      fs.writeFileSync(filePath, JSON.stringify(value, undefined, 2));
      const notifications = "notifications";
      ioClient.emit(notifications, { ...commonParameters, log: { message: "message", level: "info" } });
      if (channel === "process.runCommand")
      {
        console.info(`Running the process command with id '${value.commandId}'`);
        const parameters = value.commandId === "faultyIntentParameters" ? { dummy: "value" } :
          {
            type: "object",
            properties:
              {
                favoriteColor:
                  {
                    title: "Favorite Color",
                    description: "What is your favorite color?",
                    type: "string",
                    default: "pink"
                  },
                likeChocolate: { title: "Chocolate?", description: "Do you like chocolate?", type: "boolean" }
              },
            required: ["favoriteColor"]
          };
        const intent = value.commandId === "malformedIntent" ? { invalid: "key" } : { parameters };
        ioClient.emit(notifications, {
          ...commonParameters,
          contextId,
          intent
        }, (value) =>
        {
          fs.writeFileSync(path.join(directoryPath, "intent.result"), JSON.stringify({ contextId, value }, undefined, 2));
          onResult();
        });
      }
      else if (channel === "image.created")
      {
        console.info(`The image with id '${value.id}' was created`);
        fs.writeFileSync(path.join(directoryPath, `image-${value.id}`), value.id);
        onResult();
      }
      else if (channel === "image.updated")
      {
        console.info(`The image with id '${value.id}' was updated`);
        onResult();
      }
      else if (channel === "image.deleted")
      {
        console.info(`The image with id '${value.id}' was deleted`);
        onResult();
      }
      else if (channel === "text.computeEmbeddings")
      {
        console.info(`Computing the embeddings for the text '${value.text}'`);
        const embeddings = [];
        for (let index = 0; index < 512; index++)
        {
          embeddings.push(Math.random());
        }
        if (onResult !== undefined)
        {
          console.info(`Returning text embeddings`);
          onResult(embeddings);
        }
      }
      else if (channel === "image.computeFeatures")
      {
        console.info(`Computing the features for the image with id '${value.id}'`);
        fs.writeFileSync(path.join(directoryPath, `feature-${value.id}`), value.id);
        onResult();
      }
      else if (channel === "image.computeTags")
      {
        console.info(`Computing the tags for the image with id '${value.id}'`);
        fs.writeFileSync(path.join(directoryPath, `tag-${value.id}`), value.id);
        onResult();
      }
      else if (channel === "image.computeEmbeddings")
      {
        console.info(`Computing the embeddings for the image with id '${value.id}'`);
        fs.writeFileSync(path.join(directoryPath, `embeddings-${value.id}`), value.id);
        onResult();
      }
      else if (channel === "image.runCommand")
      {
        console.info(`Running the image command with id '${value.commandId}'`);
        onResult();
      }
    }
  );
  ioClient.emit("connection", { ...commonParameters, isOpen: true });
  return await new Promise((resolve) =>
  {
    setTimeout(resolve, 1_000_000);
  });
}

main().catch((error) =>
{
  console.error(error);
});
