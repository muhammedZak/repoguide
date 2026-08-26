import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const app = createApp();

app.listen(port, () => {
  console.log(`RepoGuide API listening on http://localhost:${port}`);
});

