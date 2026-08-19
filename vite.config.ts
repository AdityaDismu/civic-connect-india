import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },
  },
  nitro: {
    preset: "vercel",
  },
});
