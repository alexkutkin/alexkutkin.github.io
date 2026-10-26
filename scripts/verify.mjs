#!/usr/bin/env node

import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const containerName = "playwright-sandbox-1";
const argv = process.argv.slice(2);
const mode = argv[0] === "doctor" ? "doctor" : "run";
const optionArgs = mode === "doctor" ? argv.slice(1) : argv;
const options = parseOptions(optionArgs);

function parseOptions(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const equalAt = arg.indexOf("=");
    if (equalAt > 0) {
      parsed[arg.slice(2, equalAt)] = arg.slice(equalAt + 1);
    } else {
      const name = arg.slice(2);
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
      parsed[name] = value;
      index += 1;
    }
  }
  return parsed;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runCommand(command, args, { encoding = "utf8", ...extraOptions } = {}) {
  return execFileSync(command, args, {
    cwd: projectDir,
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
    ...extraOptions,
  });
}

function getDockerContainerRunning() {
  return runCommand("docker", ["inspect", "--format", "{{.State.Running}}", containerName]).trim() === "true";
}

function getListenerPids(port) {
  const output = runCommand("netstat", ["-ano", "-p", "tcp"]);
  const pids = new Set();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
    if (match && Number(match[1]) === port) pids.add(Number(match[2]));
  }
  return [...pids];
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    return true;
  }
}

function getProcessCommandLine(pid) {
  const script = `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`;
  try {
    return runCommand("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]).trim();
  } catch {
    return "";
  }
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? "";
}

async function inspectInstance(manifest) {
  const checks = [];
  const alive = Number.isInteger(manifest.serverPid) && isProcessAlive(manifest.serverPid);
  checks.push({ name: "server process is running", passed: alive, detail: `PID ${manifest.serverPid ?? "missing"}` });

  const serverMode = manifest.serverMode ?? "dev";
  const commandLine = alive ? getProcessCommandLine(manifest.serverPid) : "";
  const commandMatches = commandLine.includes("astro")
    && commandLine.includes(serverMode)
    && commandLine.includes(`--port ${manifest.port}`);
  checks.push({ name: `PID is the recorded Astro ${serverMode} server`, passed: commandMatches, detail: commandLine || "process command line unavailable" });

  let listenerPids = [];
  try {
    listenerPids = getListenerPids(manifest.port);
  } catch (error) {
    checks.push({ name: "verification port ownership can be inspected", passed: false, detail: error.message });
  }
  const ownsPort = listenerPids.includes(manifest.serverPid);
  checks.push({ name: "verification server owns its configured port", passed: ownsPort, detail: `port ${manifest.port}; listener PIDs ${listenerPids.join(", ") || "none"}` });

  let responseStatus = null;
  let pageIdentity = "";
  let pageTitle = "";
  let pageHeading = "";
  let fetchError = "";
  try {
    const response = await fetch(`http://127.0.0.1:${manifest.port}/`, { signal: AbortSignal.timeout(3000) });
    responseStatus = response.status;
    const html = await response.text();
    const identityTag = html.match(/<meta\b[^>]*\bname=["']application-name["'][^>]*>/i)?.[0] ?? "";
    pageIdentity = attr(identityTag, "content");
    pageTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    pageHeading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "";
  } catch (error) {
    fetchError = error.message;
  }
  checks.push({ name: "landing page responds successfully", passed: responseStatus === 200, detail: `HTTP ${responseStatus ?? "unavailable"}${fetchError ? `; ${fetchError}` : ""}` });
  const expectedAppName = process.env.VERIFY_EXPECTED_APP_NAME ?? "Alex Kutkin personal site";
  checks.push({ name: "landing page identifies the expected app", passed: pageIdentity === expectedAppName, detail: `application-name=${JSON.stringify(pageIdentity)}; expected ${JSON.stringify(expectedAppName)}` });
  checks.push({ name: "landing page has a title and primary heading", passed: Boolean(pageTitle && pageHeading), detail: `title=${JSON.stringify(pageTitle)}; h1=${JSON.stringify(pageHeading)}` });

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8"));
  const astroVersion = packageJson.dependencies?.astro ?? packageJson.devDependencies?.astro ?? "unknown";
  checks.push({ name: "local app package is the expected Astro project", passed: packageJson.name === "alexkutkin.github.io" && astroVersion !== "unknown", detail: `${packageJson.name}; Astro ${astroVersion}` });

  return {
    checkedAt: new Date().toISOString(),
    runId: manifest.runId,
    port: manifest.port,
    serverPid: manifest.serverPid,
    browserBaseUrl: manifest.baseUrl,
    checks,
    passed: checks.every((check) => check.passed),
  };
}

async function doctorExistingRun(runId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(runId ?? "")) throw new Error("doctor requires --run-id from a verification run");
  const runDir = path.join(projectDir, "artifacts", "verification", runId);
  const manifestPath = path.join(runDir, "run.json");
  if (!fs.existsSync(manifestPath)) throw new Error(`No verification run manifest at ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const result = await inspectInstance(manifest);
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}

function validatePort(rawPort) {
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid TCP port: ${rawPort}`);
  return port;
}

function getConfig() {
  const suppliedBaseUrl = options["base-url"] ?? process.env.BASE_URL;
  let baseCandidate;
  if (suppliedBaseUrl) {
    try {
      baseCandidate = new URL(suppliedBaseUrl);
    } catch {
      throw new Error(`Invalid BASE_URL: ${suppliedBaseUrl}`);
    }
  }
  const port = validatePort(options.port ?? process.env.PORT ?? baseCandidate?.port ?? "4321");
  const baseUrl = (suppliedBaseUrl ?? `http://host.docker.internal:${port}`).replace(/\/$/, "");
  const parsedBaseUrl = new URL(baseUrl);
  if (parsedBaseUrl.protocol !== "http:" || Number(parsedBaseUrl.port) !== port || parsedBaseUrl.pathname !== "" && parsedBaseUrl.pathname !== "/" || parsedBaseUrl.search || parsedBaseUrl.hash) {
    throw new Error(`BASE_URL must be an HTTP origin for the same configured PORT (currently ${port}): ${baseUrl}`);
  }
  const suite = options.suite ?? process.env.SUITE ?? "foundation";
  const suites = ["foundation", "site"];
  if (!suites.includes(suite)) throw new Error(`Unsupported suite ${JSON.stringify(suite)}; available suites: ${suites.join(", ")}`);
  return { port, baseUrl, suite };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createRunId() {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
  return `${timestamp}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
}

async function waitForDoctor(manifest) {
  const deadline = Date.now() + 30000;
  let latest;
  while (Date.now() < deadline) {
    latest = await inspectInstance(manifest);
    if (latest.passed) return latest;
    if (!isProcessAlive(manifest.serverPid)) break;
    await sleep(500);
  }
  return latest ?? await inspectInstance(manifest);
}

async function stopOwnedServer(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit").catch(() => []);
  child.kill();
  await Promise.race([exited, sleep(8000)]);
}

function copyBrowserArtifacts(stagingDir, runDir) {
  const browserDir = path.join(runDir, "browser");
  fs.mkdirSync(browserDir, { recursive: true });
  runCommand("docker", ["cp", `${containerName}:${stagingDir}/browser/.`, browserDir]);
}

async function runVerification() {
  const config = getConfig();
  const runId = createRunId();
  const runDir = path.join(projectDir, "artifacts", "verification", runId);
  fs.mkdirSync(path.dirname(runDir), { recursive: true });
  fs.mkdirSync(runDir, { recursive: false });
  const stagingDir = `/tmp/alexkutkin-personal-site-${runId}`;
  const browserScript = path.join(projectDir, "scripts", "verify-browser.cjs");
  const astroCli = path.join(projectDir, "node_modules", "astro", "bin", "astro.mjs");
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8"));
  const serverMode = config.suite === "site" ? "preview" : "dev";
  const serverArgs = serverMode === "preview"
    ? [astroCli, "preview", "--host", "0.0.0.0", "--port", String(config.port), "--ignore-lock"]
    : [astroCli, "dev", "--host", "0.0.0.0", "--port", String(config.port), "--strictPort"];
  const manifest = {
    runId,
    suite: config.suite,
    serverMode,
    port: config.port,
    baseUrl: config.baseUrl,
    astroVersion: packageJson.dependencies?.astro ?? "unknown",
    startedAt: new Date().toISOString(),
    serverPid: null,
    serverCommand: `${process.execPath} ${serverArgs.join(" ")}`,
    status: "starting",
  };
  const manifestPath = path.join(runDir, "run.json");
  let child;
  let stagingPrepared = false;
  let copiedBrowserArtifacts = false;
  let failure;
  let doctorResult;
  let browserExitCode = null;

  try {
    if (!fs.existsSync(astroCli)) throw new Error(`Astro CLI not found: ${astroCli}`);
    if (!getDockerContainerRunning()) throw new Error(`${containerName} is not running; verification uses the existing container without changing its lifecycle.`);
    const playwrightInfo = runCommand("docker", ["exec", containerName, "node", "-e", "const p=require('/app/node_modules/@playwright/test'); process.stdout.write(JSON.stringify({version:require('/app/node_modules/@playwright/test/package.json').version, chromium:p.chromium.executablePath()}))"]).trim();
    writeJson(path.join(runDir, "playwright-runtime.json"), JSON.parse(playwrightInfo));

    const occupiedPids = getListenerPids(config.port);
    if (occupiedPids.length) throw new Error(`Refusing to use occupied port ${config.port}; listener PID(s): ${occupiedPids.join(", ")}. Choose another --port.`);

    if (config.suite === "site") {
      const buildStartedAt = new Date().toISOString();
      try {
        const buildOutput = runCommand(process.execPath, [astroCli, "build"], { timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
        fs.writeFileSync(path.join(runDir, "build.stdout.log"), buildOutput, "utf8");
        fs.writeFileSync(path.join(runDir, "build.stderr.log"), "", "utf8");
        manifest.build = { status: "passed", startedAt: buildStartedAt, finishedAt: new Date().toISOString() };
      } catch (error) {
        fs.writeFileSync(path.join(runDir, "build.stdout.log"), error.stdout?.toString() ?? "", "utf8");
        fs.writeFileSync(path.join(runDir, "build.stderr.log"), error.stderr?.toString() ?? error.message, "utf8");
        manifest.build = { status: "failed", startedAt: buildStartedAt, finishedAt: new Date().toISOString() };
        writeJson(manifestPath, manifest);
        throw new Error(`Static build failed (exit ${error.status ?? 1}); see ${path.join(runDir, "build.stderr.log")}`);
      }
      for (const required of ["index.html", "404.html", "en/index.html", "ru/index.html", "en/cv/index.html", "ru/cv/index.html"]) {
        if (!fs.existsSync(path.join(projectDir, "dist", required))) throw new Error(`Build output is missing dist/${required}`);
      }
      console.log(`BUILD ${JSON.stringify({ status: "passed", suite: config.suite })}`);
    }

    const stdoutFd = fs.openSync(path.join(runDir, "server.stdout.log"), "w");
    const stderrFd = fs.openSync(path.join(runDir, "server.stderr.log"), "w");
    child = spawn(process.execPath, serverArgs, {
      cwd: projectDir,
      env: { ...process.env, HOST: "0.0.0.0", PORT: String(config.port) },
      windowsHide: true,
      stdio: ["ignore", stdoutFd, stderrFd],
    });
    child.on("error", (error) => {
      manifest.spawnError = error.message;
      writeJson(manifestPath, manifest);
    });
    fs.closeSync(stdoutFd);
    fs.closeSync(stderrFd);
    manifest.serverPid = child.pid;
    manifest.status = "server-starting";
    writeJson(path.join(runDir, "server.pid"), { pid: child.pid, runId });
    writeJson(manifestPath, manifest);
    console.log(`START ${JSON.stringify({ runId, pid: child.pid, port: config.port, baseUrl: config.baseUrl, suite: config.suite, astroVersion: manifest.astroVersion })}`);

    doctorResult = await waitForDoctor(manifest);
    writeJson(path.join(runDir, "doctor.json"), doctorResult);
    console.log(`DOCTOR ${JSON.stringify(doctorResult)}`);
    if (!doctorResult.passed) throw new Error("Doctor did not confirm a usable, run-owned landing page; browser drive was not started.");

    const selectorEnv = {
      VERIFY_APP_IDENTITY_SELECTOR: process.env.VERIFY_APP_IDENTITY_SELECTOR ?? 'meta[name="application-name"]',
      VERIFY_HEADING_SELECTOR: process.env.VERIFY_HEADING_SELECTOR ?? "main h1",
      VERIFY_LINK_SELECTOR: process.env.VERIFY_LINK_SELECTOR ?? "a[href]",
      VERIFY_EXPECTED_APP_NAME: process.env.VERIFY_EXPECTED_APP_NAME ?? "Alex Kutkin personal site",
    };
    runCommand("docker", ["exec", containerName, "node", "-e", `require('node:fs').mkdirSync(${JSON.stringify(stagingDir + "/browser")}, {recursive:true})`]);
    stagingPrepared = true;
    runCommand("docker", ["cp", browserScript, `${containerName}:${stagingDir}/verify-browser.cjs`]);
    const dockerArgs = ["exec"];
    for (const [name, value] of Object.entries(selectorEnv)) dockerArgs.push("-e", `${name}=${value}`);
    dockerArgs.push(containerName, "node", `${stagingDir}/verify-browser.cjs`, `--base-url=${config.baseUrl}`, `--artifact-dir=${stagingDir}/browser`, `--suite=${config.suite}`);
    try {
      const browserTimeout = config.suite === "site" ? 240000 : 120000;
      const browserOutput = runCommand("docker", dockerArgs, { timeout: browserTimeout, maxBuffer: 16 * 1024 * 1024 });
      fs.writeFileSync(path.join(runDir, "browser.stdout.log"), browserOutput, "utf8");
      browserExitCode = 0;
      console.log(browserOutput.trim());
    } catch (error) {
      fs.writeFileSync(path.join(runDir, "browser.stdout.log"), error.stdout?.toString() ?? "", "utf8");
      fs.writeFileSync(path.join(runDir, "browser.stderr.log"), error.stderr?.toString() ?? error.message, "utf8");
      browserExitCode = error.status ?? 1;
      throw new Error(`Browser drive failed (exit ${browserExitCode}); see ${path.join(runDir, "browser.stderr.log")}`);
    }
    manifest.status = "verified";
  } catch (error) {
    failure = error;
    manifest.status = "failed";
    manifest.error = error.message;
  } finally {
    await stopOwnedServer(child);
    manifest.serverStoppedAt = new Date().toISOString();
    manifest.serverExitCode = child?.exitCode ?? null;
    manifest.serverSignalCode = child?.signalCode ?? null;
    manifest.serverStopped = child?.pid ? !isProcessAlive(child.pid) : true;
    try {
      manifest.ownedListenerAfterStop = child?.pid ? !getListenerPids(config.port).includes(child.pid) : true;
    } catch (error) {
      manifest.ownedListenerAfterStop = false;
      manifest.serverCleanupCheckError = error.message;
    }
    manifest.browserExitCode = browserExitCode;
    if (!manifest.serverStopped || !manifest.ownedListenerAfterStop) {
      const error = new Error(`The server process or its owned listener remained after cleanup (PID ${child?.pid ?? "missing"}, port ${config.port}).`);
      if (!failure) failure = error;
      manifest.status = "failed";
    }

    if (stagingPrepared) {
      try {
        copyBrowserArtifacts(stagingDir, runDir);
        copiedBrowserArtifacts = true;
      } catch (error) {
        manifest.artifactCopyError = error.message;
        if (!failure) failure = error;
        manifest.status = "failed";
      }
      try {
        if (!/^\/tmp\/alexkutkin-personal-site-[a-zA-Z0-9_-]+$/.test(stagingDir)) throw new Error(`Refusing unsafe staging path ${stagingDir}`);
        runCommand("docker", ["exec", containerName, "node", "-e", `require('node:fs').rmSync(${JSON.stringify(stagingDir)}, {recursive:true, force:true})`]);
      } catch (error) {
        manifest.stagingCleanupError = error.message;
        if (!failure) failure = error;
        manifest.status = "failed";
      }
    }

    manifest.finishedAt = new Date().toISOString();
    manifest.doctorPassed = doctorResult?.passed ?? false;
    manifest.browserArtifactsCopied = copiedBrowserArtifacts;
    writeJson(manifestPath, manifest);
  }

  console.log(`CLEANUP ${JSON.stringify({ serverPid: child?.pid ?? null, serverExitCode: manifest.serverExitCode, serverSignalCode: manifest.serverSignalCode, serverStopped: manifest.serverStopped, ownedListenerAfterStop: manifest.ownedListenerAfterStop, stagingRemoved: stagingPrepared && !manifest.stagingCleanupError, artifacts: runDir, browserArtifactsCopied: copiedBrowserArtifacts })}`);
  if (failure) throw failure;
  if (!copiedBrowserArtifacts) throw new Error(`Browser artifacts were not copied to ${runDir}`);
  const requiredEvidence = config.suite === "site"
    ? ["report.json", "aria-snapshot.txt", "trace.zip", "screenshots/home-en.png", "screenshots/home-ru.png", "screenshots/article-en.png", "screenshots/article-ru.png", "screenshots/cv-en.png", "screenshots/cv-ru.png", "screenshots/theme-dark.png", "screenshots/mobile-home.png", "screenshots/mobile-article.png", "screenshots/not-found.png", "screenshots/mermaid.png", "screenshots/mermaid-error.png"]
    : ["report.json", "landing-page.png", "aria-snapshot.txt", "trace.zip"];
  for (const required of requiredEvidence) {
    const artifactPath = path.join(runDir, "browser", required);
    if (!fs.existsSync(artifactPath) || fs.statSync(artifactPath).size === 0) throw new Error(`Expected evidence artifact is missing or empty: ${artifactPath}`);
  }
  console.log(`PASS ${JSON.stringify({ runId, artifacts: runDir, evidence: requiredEvidence, serverPid: child.pid, serverStopped: manifest.serverStopped, ownedListenerAfterStop: manifest.ownedListenerAfterStop })}`);
}

if (mode === "doctor") {
  await doctorExistingRun(options["run-id"]);
} else {
  try {
    await runVerification();
  } catch (error) {
    console.error(`FAIL ${error.stack ?? error.message}`);
    process.exitCode = 1;
  }
}
