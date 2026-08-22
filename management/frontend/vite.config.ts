import { resolve } from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		host: true,
		port: 5174,
		strictPort: true,
		proxy: {
			"/api/v1": {
				target: "http://127.0.0.1:8010",
				changeOrigin: true,
			},
		},
	},
	plugins: [
		devtools(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			routeFileIgnorePattern: "_components",
		}),
		tailwindcss(),
		react(),
		babel({ presets: [reactCompilerPreset()] }),
	],
	test: {
		projects: [
			{
				test: {
					name: "node-logic",
					environment: "node",
					include: ["src/**/*.unit.test.ts"],
				},
			},
			{
				resolve: {
					alias: {
						"@": resolve(import.meta.dirname, "./src"),
					},
				},
				test: {
					name: "react-components",
					include: ["src/**/*.component.test.tsx"],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
