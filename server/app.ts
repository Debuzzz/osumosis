import Fastify from "fastify";
import { registerLifecycle } from "./core/lifecycle";
import { createServices } from "./core/services";
import { registerAccountApi } from "./features/account/api";
import { registerAnalysisApi } from "./features/analysis/api";
import { registerCollectionsApi } from "./features/collections/api";
import { registerDiscoveryApi } from "./features/discovery/api";
import { registerLibraryApi } from "./features/library/api";
import { registerMapsApi } from "./features/maps/api";
import { registerMediaApi } from "./features/media/api";
import { registerPlaysApi } from "./features/plays/api";
import { registerRecommendationsApi } from "./features/recommendations/api";
import { registerSettingsApi } from "./features/settings/api";
import { registerTelemetryApi } from "./features/telemetry/api";
import { registerFrontend } from "./http/frontend";
import { registerSecurity } from "./http/security";
import { registerSystemApi } from "./http/system-routes";
export async function createApp() {
  const services = await createServices();
  const app = Fastify({
    logger: { level: "warn", redact: ["req.headers.authorization", "req.body.clientSecret"] },
    bodyLimit: 1024 * 1024,
  });
  registerLifecycle(app, services);
  registerSecurity(app, services.port);
  await services.realtime.register(app, services);
  for (const register of [
    registerSystemApi,
    registerAccountApi,
    registerAnalysisApi,
    registerCollectionsApi,
    registerDiscoveryApi,
    registerLibraryApi,
    registerMapsApi,
    registerMediaApi,
    registerPlaysApi,
    registerRecommendationsApi,
    registerSettingsApi,
    registerTelemetryApi,
  ])
    register(app, services);
  await registerFrontend(app);
  return { app, services };
}
