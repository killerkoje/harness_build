#!/usr/bin/env node
/**
 * Harness Phase 3.5 — web-vital-kit / Lighthouse CLI runner.
 *
 * Requires a running app server (performance-validator starts it).
 *
 *   LIGHTHOUSE_URL=http://127.0.0.1:3000 node harness-performance-check.mjs \
 *     --workspace _workspace/my-feature --profiles slow4g,fast4g
 */

import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { workspace: "_workspace", profiles: ["slow4g"], url: process.env.LIGHTHOUSE_URL || "" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--workspace" && argv[i + 1]) out.workspace = argv[++i];
    else if (argv[i] === "--profiles" && argv[i + 1]) {
      out.profiles = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--url" && argv[i + 1]) out.url = argv[++i];
  }
  return out;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function detectPm(cwd) {
  if (await exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(path.join(cwd, "yarn.lock"))) return "yarn";
  if (await exists(path.join(cwd, "bun.lockb"))) return "bun";
  return "npm";
}

async function findRunner(cwd) {
  const allScript = path.join(cwd, "scripts/run-lighthouse-network-all.mjs");
  if (await exists(allScript)) {
    return { mode: "all", argv: [process.execPath, allScript] };
  }

  const singleScript = path.join(cwd, "scripts/run-lighthouse-network.mjs");
  if (await exists(singleScript)) {
    return { mode: "single", script: singleScript };
  }

  if (!(await exists(path.join(cwd, "package.json")))) return null;

  const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
  const scripts = pkg.scripts ?? {};
  const pm = await detectPm(cwd);

  if (scripts["perf:lighthouse:network"]) {
    const run = pm === "yarn" ? ["yarn", "perf:lighthouse:network"] : [pm, "run", "perf:lighthouse:network"];
    return { mode: "npm-all", argv: run };
  }

  const profileScripts = ["slow4g", "fast4g", "none"].filter((p) => scripts[`perf:lighthouse:${p}`]);
  if (profileScripts.length) {
    return { mode: "npm-profiles", pm, profileScripts };
  }

  return null;
}

function run(cmd, cwd, env = {}) {
  const [bin, ...args] = cmd;
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => {
      stdout += c;
    });
    child.stderr?.on("data", (c) => {
      stderr += c;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`exit ${code}\n${stderr || stdout}`));
    });
  });
}

async function loadSummary(cwd, profile) {
  const p = path.join(cwd, "docs/lighthouse/network-profiles", `summary-${profile}.json`);
  if (!(await exists(p))) return null;
  return JSON.parse(await readFile(p, "utf8"));
}

function tableRow(profile, row) {
  if (!row) return `| ${profile} | — | — | — | — | — |`;
  return `| ${profile} | ${row.performanceScore ?? "—"} | ${row.fcpMs ?? "—"} | ${row.lcpMs ?? "—"} | ${row.tbtMs ?? "—"} | ${row.ttiMs ?? "—"} |`;
}

async function writeReport(workspaceDir, payload) {
  await mkdir(workspaceDir, { recursive: true });
  const out = path.join(workspaceDir, "03b_performance_report.md");
  const { status, url, profiles, rows, gateMode, notes, baselinePath } = payload;

  const md = `# Performance Report (Lighthouse CLI)

- **STATUS:** ${status}
- **gate_mode:** ${gateMode}
- **측정 시각:** ${new Date().toISOString()}
- **URL:** \`${url}\`
- **프로필:** ${profiles.join(", ")}

## 결과 (Performance)

| 프로필 | Perf | FCP (ms) | LCP (ms) | TBT (ms) | TTI (ms) |
|--------|-----:|---------:|---------:|---------:|---------:|
${profiles.map((p) => tableRow(p, rows[p])).join("\n")}

## 판정

${notes.join("\n")}

## 원시 데이터

- \`${baselinePath || "docs/lighthouse/network-profiles/baseline.md"}\`
- \`docs/lighthouse/network-profiles/summary-*.json\`
- \`docs/lighthouse/network-profiles/latest-*.json\`
`;

  await writeFile(out, md, "utf8");
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const url = args.url || process.env.LIGHTHOUSE_URL || "http://127.0.0.1:3000";
  const gateMode = process.env.HARNESS_PERF_GATE || "warn";

  const runner = await findRunner(cwd);
  if (!runner) {
    await writeReport(path.resolve(cwd, args.workspace), {
      status: "SKIP",
      url,
      profiles: args.profiles,
      rows: {},
      gateMode,
      baselinePath: null,
      notes: [
        "web-vital-kit Lighthouse 스크립트가 없어 측정을 건너뜀.",
        "설치: `npx github:LEEHEEWON123/web-vital-cheking init` 후 `yarn install`",
        "또는 package.json에 `perf:lighthouse:network` 스크립트 추가.",
      ],
    });
    console.error("SKIP: no lighthouse runner found");
    process.exit(0);
  }

  const env = { LIGHTHOUSE_URL: url };

  try {
    if (runner.mode === "all" || runner.mode === "npm-all") {
      await run(runner.argv, cwd, env);
    } else if (runner.mode === "single") {
      for (const profile of args.profiles) {
        await run([process.execPath, runner.script, profile], cwd, env);
      }
      // baseline.md may be missing — summaries still written per profile
    } else if (runner.mode === "npm-profiles") {
      for (const profile of args.profiles) {
        const scriptName = `perf:lighthouse:${profile}`;
        if (!runner.profileScripts.includes(profile)) continue;
        const cmd =
          runner.pm === "yarn"
            ? ["yarn", scriptName]
            : [runner.pm, "run", scriptName];
        await run(cmd, cwd, env);
      }
    }

    const rows = {};
    for (const profile of args.profiles) {
      rows[profile] = await loadSummary(cwd, profile);
    }

    const slow = rows.slow4g;
    const notes = [];
    let status = "PASS";

    if (slow?.performanceScore != null && slow.performanceScore < 50) {
      notes.push(`⚠️ Slow 4G Performance ${slow.performanceScore} — 50 미만 (gate_mode=${gateMode})`);
      if (gateMode === "block") status = "FAIL";
      else status = "WARN";
    } else if (slow?.lcpMs != null && slow.lcpMs > 4000) {
      notes.push(`⚠️ Slow 4G LCP ${slow.lcpMs}ms — 4000ms 초과`);
      if (gateMode === "block") status = "FAIL";
      else if (status === "PASS") status = "WARN";
    } else {
      notes.push("Lighthouse CLI 측정 완료. 기본 임계값 내 PASS.");
    }

    const baselinePath = "docs/lighthouse/network-profiles/baseline.md";
    const reportPath = await writeReport(path.resolve(cwd, args.workspace), {
      status,
      url: slow?.url || url,
      profiles: args.profiles,
      rows,
      gateMode,
      baselinePath: (await exists(path.join(cwd, baselinePath))) ? baselinePath : null,
      notes,
    });

    console.log(`Wrote ${reportPath}`);
    console.log(`STATUS=${status}`);
    if (gateMode === "block" && status === "FAIL") process.exit(1);
  } catch (err) {
    await writeReport(path.resolve(cwd, args.workspace), {
      status: "ERROR",
      url,
      profiles: args.profiles,
      rows: {},
      gateMode,
      baselinePath: null,
      notes: [`Lighthouse CLI 실행 실패: ${err.message}`],
    });
    console.error(err.message);
    process.exit(1);
  }
}

main();
