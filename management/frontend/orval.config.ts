import { defineConfig } from "orval";

export default defineConfig({
	ego: {
		input: "http://127.0.0.1:8010/api/v1/openapi.json",
		output: {
			mode: "tags-split",
			target: "src/api",
			client: "react-query",
			httpClient: "fetch",
			clean: true,
			schemas: "src/api/schemas",
			override: {
				mutator: {
					path: "src/lib/mutator.ts",
					name: "customFetch",
				},
			},
		},
	},
	egoZod: {
		input: "http://127.0.0.1:8010/api/v1/openapi.json",
		output: {
			mode: "tags-split",
			client: "zod",
			target: "src/api/zod",
			clean: true,
		},
	},
});
