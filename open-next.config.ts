import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // OpenNext Cloudflare configuration
  // See: https://opennext.js.org/cloudflare
  buildCommand: 'npm run build:next',
});
