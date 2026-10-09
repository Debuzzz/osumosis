import { createApp } from "./app";
import { startService } from "./core/lifecycle";

process.title = "osumosis";
const { app, services } = await createApp();
await startService(app, services);
