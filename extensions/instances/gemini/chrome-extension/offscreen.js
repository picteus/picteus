console.info("Running the offscreen activity");

setInterval(async () =>
{
  await chrome.runtime.sendMessage({ command: "keepAlive" });
}, 20_000);
