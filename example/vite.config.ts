import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.IS_GITHUB_PAGES ? "/react-wake-lock/" : "/",
  plugins: [react()],
});
