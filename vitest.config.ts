import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "src/lib/methodology.contract.test.ts",
      "src/lib/methodologyOrchestrator.test.ts",
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/unit",
      reporter: ["text", "json-summary"],
      include: [
        "src/lib/programEngine.ts",
        "src/lib/methodologyOrchestrator.ts",
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
