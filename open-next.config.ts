import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({
  // OpenNext Cloudflare configuration
  // See: https://opennext.js.org/cloudflare
});

export default {
  ...config,
  buildCommand: 'npm run build:next',
};
