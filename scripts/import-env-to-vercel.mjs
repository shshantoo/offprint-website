#!/usr/bin/env node
/**
 * OFFPRINT (অফপ্রিন্ট) — Secure Vercel Environment Variables Importer
 *
 * This script safely reads environment variables from `.env.vercel` and imports them
 * into your Vercel project using the Vercel CLI.
 *
 * Security & Safety Highlights:
 * 1. Values are piped directly to the Vercel CLI via standard input (stdin). Secrets
 *    are NEVER passed as command-line arguments, exposed in process tables, or logged.
 * 2. Unresolved placeholder values (e.g. "your-key-here") and missing required keys
 *    are rejected before any external API calls are made.
 * 3. Checks Vercel CLI authentication (`vercel whoami`) and project linking first.
 * 4. Detects existing Vercel environment variables and prompts before overwriting.
 * 5. Warns prominently if live production Supabase credentials are being imported into
 *    Preview or Development environments.
 * 6. Never triggers a deployment automatically.
 *
 * Usage:
 *   node scripts/import-env-to-vercel.mjs
 *   node scripts/import-env-to-vercel.mjs --env=production
 *   node scripts/import-env-to-vercel.mjs --env=preview --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

// Variables that MUST be provided with valid non-empty, non-placeholder values
const CORE_REQUIRED_VARIABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_DEFAULT_TIMEZONE",
];

// Variables that are sensitive and must NEVER be logged or echoed
const SENSITIVE_KEY_PATTERNS = [
  "SECRET",
  "SERVICE_ROLE",
  "ENCRYPTION_KEY",
  "PASSWORD",
  "PASSCODE",
  "TOKEN",
  "PRIVATE_KEY",
];

function isSensitive(key) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => key.toUpperCase().includes(pattern));
}

function isPlaceholder(val) {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return (
    lower === "" ||
    lower.includes("your-") ||
    lower.includes("your_") ||
    lower.includes("change_me") ||
    lower.includes("0123456789abcdef") ||
    lower.includes("sb_publishable_your_key_here") ||
    lower.includes("your-supabase-service-role-key-here") ||
    lower.includes("your-google-oauth-client-")
  );
}

/**
 * Robust dotenv parser supporting comments, quoted strings, and multiline values.
 */
function parseDotenv(content) {
  const result = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines and full-line comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();

    // Strip wrapping quotes if present
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    } else {
      // Strip trailing comments on unquoted values: KEY=value # comment
      const commentIdx = val.indexOf(" #");
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trim();
      }
    }

    result.push({ key, value: val, lineNumber: i + 1 });
  }

  return result;
}

function promptQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function findVercelCommand() {
  // Check if vercel or npx is available
  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "where.exe" : "which";
  
  const checkGlobal = spawnSync(cmd, ["vercel"], { encoding: "utf8" });
  if (checkGlobal.status === 0 && checkGlobal.stdout.trim()) {
    return { cmd: "vercel", args: [] };
  }

  // Fallback to npx vercel
  return { cmd: isWindows ? "npx.cmd" : "npx", args: ["vercel"] };
}

function runVercelCommand(commandInfo, args, options = {}) {
  const fullArgs = [...commandInfo.args, ...args];
  return spawnSync(commandInfo.cmd, fullArgs, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    ...options,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const forceYes = args.includes("--yes") || args.includes("-y");
  
  let targetEnv = null;
  const envArg = args.find((a) => a.startsWith("--env="));
  if (envArg) {
    targetEnv = envArg.split("=")[1].toLowerCase();
  }

  console.log("\n=======================================================");
  console.log(" OFFPRINT — Secure Vercel Environment Importer");
  console.log("=======================================================\n");

  let envFilePath = path.join(REPO_ROOT, ".env.vercel");
  const fileArg = args.find((a) => a.startsWith("--file="));
  if (fileArg) {
    const customFile = fileArg.split("=")[1];
    envFilePath = path.isAbsolute(customFile) ? customFile : path.join(REPO_ROOT, customFile);
  }
  if (!fs.existsSync(envFilePath)) {
    console.error(`✖ Error: Configuration file not found at: ${envFilePath}`);
    console.error("  Please ensure .env.vercel exists in the project root.");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(envFilePath, "utf8");
  const parsedEntries = parseDotenv(fileContent);

  if (parsedEntries.length === 0) {
    console.error("✖ Error: No environment variables found in .env.vercel.");
    process.exit(1);
  }

  // Step 1: Validate required core variables and detect unresolved placeholders
  const missingCore = [];
  const placeholderVariables = [];
  const validVariables = [];
  const emptyOptionalVariables = [];

  for (const { key, value } of parsedEntries) {
    const isCore = CORE_REQUIRED_VARIABLES.includes(key);

    if (isPlaceholder(value)) {
      if (isCore) {
        missingCore.push(key);
      } else if (value.trim() !== "") {
        placeholderVariables.push(key);
      } else {
        emptyOptionalVariables.push(key);
      }
    } else {
      validVariables.push({ key, value });
    }
  }

  if (missingCore.length > 0) {
    console.error("✖ ABORTED: Missing required core environment variables:");
    for (const key of missingCore) {
      console.error(`   - ${key} (Required for application operation)`);
    }
    console.error("\nPlease open .env.vercel and provide the required values before importing.");
    console.error("Refer to DEPLOYMENT.md for instructions on obtaining missing credentials.\n");
    process.exit(1);
  }

  if (placeholderVariables.length > 0) {
    console.warn("⚠ Warning: The following variables contain unresolved placeholder text:");
    for (const key of placeholderVariables) {
      console.warn(`   - ${key}`);
    }
    console.warn("These variables will NOT be imported to avoid deploying invalid credentials.\n");
  }

  // Step 2: Detect Vercel CLI and verify authentication & project link
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const vercelCmd = findVercelCommand();

  if (!isDryRun) {
    console.log("Checking Vercel CLI status...");
    const whoami = runVercelCommand(vercelCmd, ["whoami"]);
    if (whoami.status !== 0) {
      console.error("\n✖ Vercel CLI authentication check failed.");
      console.error("  Please ensure the Vercel CLI is installed and authenticated:");
      console.error("    1. npm install -g vercel");
      console.error("    2. vercel login");
      console.error("    3. vercel link");
      console.error("\nAlternatively, you can manually copy variables to the Vercel Dashboard");
      console.error("(Settings -> Environment Variables). See DEPLOYMENT.md for details.\n");
      rl.close();
      process.exit(1);
    }
    const username = whoami.stdout.trim().split("\n")[0];
    console.log(`✔ Authenticated as: ${username}`);

    // Check project link
    const projectCheck = runVercelCommand(vercelCmd, ["project", "ls"]);
    if (projectCheck.status !== 0 && !fs.existsSync(path.join(REPO_ROOT, ".vercel", "project.json"))) {
      console.error("\n✖ Vercel project is not linked to this directory.");
      console.error("  Please link your project first by running:");
      console.error("    vercel link\n");
      rl.close();
      process.exit(1);
    }
    console.log("✔ Vercel project connection confirmed.\n");
  }

  // Step 3: Select target environment
  const validEnvs = ["production", "preview", "development"];
  while (!targetEnv || !validEnvs.includes(targetEnv)) {
    const choice = await promptQuestion(
      rl,
      "Select target Vercel environment [1: production, 2: preview, 3: development]: "
    );
    if (choice === "1" || choice.toLowerCase() === "production") targetEnv = "production";
    else if (choice === "2" || choice.toLowerCase() === "preview") targetEnv = "preview";
    else if (choice === "3" || choice.toLowerCase() === "development") targetEnv = "development";
    else console.log("Invalid choice. Please enter 1, 2, or 3.");
  }

  // Step 4: Safety warning for production database credentials in Preview / Development
  const supabaseUrlEntry = validVariables.find((v) => v.key === "NEXT_PUBLIC_SUPABASE_URL");
  if (
    targetEnv !== "production" &&
    supabaseUrlEntry &&
    supabaseUrlEntry.value.includes("qqklsbbysybzivifnykd")
  ) {
    console.log("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log(`⚠ CAUTION: You are importing LIVE PRODUCTION Supabase credentials`);
    console.log(`  into the '${targetEnv.toUpperCase()}' environment!`);
    console.log(`  Target Project: qqklsbbysybzivifnykd.supabase.co`);
    console.log(`  Preview/Dev deployments will read and write to your LIVE production database.`);
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");

    if (!forceYes) {
      const confirmLive = await promptQuestion(
        rl,
        `Are you sure you want to proceed with live database credentials for ${targetEnv}? (yes/no): `
      );
      if (confirmLive.toLowerCase() !== "yes" && confirmLive.toLowerCase() !== "y") {
        console.log("Aborted by user.");
        rl.close();
        process.exit(0);
      }
    }
  }

  // Step 5: Summary preview
  console.log(`\nReady to import ${validVariables.length} variable(s) to '${targetEnv}'${isDryRun ? " (DRY RUN)" : ""}:`);
  console.log("----------------------------------------------------------------------");
  for (const { key, value } of validVariables) {
    const secTag = isSensitive(key) ? "[SECRET]" : "[PUBLIC]";
    console.log(`  • ${key.padEnd(38)} ${secTag.padEnd(10)} (${value.length} chars)`);
  }
  if (emptyOptionalVariables.length > 0) {
    console.log("\nSkipping empty optional variables:");
    for (const key of emptyOptionalVariables) {
      console.log(`  ○ ${key} (Empty, using code defaults or Vercel system URL)`);
    }
  }
  console.log("----------------------------------------------------------------------\n");

  if (!forceYes && !isDryRun) {
    const confirm = await promptQuestion(
      rl,
      `Proceed with importing these ${validVariables.length} variables into Vercel (${targetEnv})? (yes/no): `
    );
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("Import cancelled.");
      rl.close();
      process.exit(0);
    }
  }

  rl.close();

  if (isDryRun) {
    console.log("\n[DRY RUN COMPLETE] No variables were sent to Vercel.");
    process.exit(0);
  }

  // Step 6: Query existing Vercel environment variables to avoid silent overwrites
  console.log("\nQuerying existing Vercel environment variables...");
  const lsResult = runVercelCommand(vercelCmd, ["env", "ls", targetEnv]);
  const existingVars = new Set();
  if (lsResult.status === 0) {
    const lines = lsResult.stdout.split("\n");
    for (const line of lines) {
      const match = line.trim().match(/^([A-Za-z0-9_]+)/);
      if (match && match[1]) {
        existingVars.add(match[1]);
      }
    }
  }

  // Step 7: Import variables one by one securely via stdin piping
  console.log(`\nImporting variables into Vercel (${targetEnv})...\n`);
  const results = { success: [], skipped: [], failed: [] };

  for (const { key, value } of validVariables) {
    const alreadyExists = existingVars.has(key);

    if (alreadyExists) {
      // Safely remove existing first to avoid interactive overwrite prompt stall
      runVercelCommand(vercelCmd, ["env", "rm", key, targetEnv, "-y"]);
    }

    const child = spawn(
      vercelCmd.cmd,
      [...vercelCmd.args, "env", "add", key, targetEnv],
      {
        cwd: REPO_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let _stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      _stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Pipe the value directly into stdin and close the stream
    child.stdin.write(value + "\n");
    child.stdin.end();

    const exitCode = await new Promise((resolve) => {
      child.on("close", resolve);
    });

    if (exitCode === 0) {
      console.log(`  ✔ ${key.padEnd(38)} [${alreadyExists ? "UPDATED" : "ADDED"}]`);
      results.success.push(key);
    } else {
      console.error(`  ✖ ${key.padEnd(38)} [FAILED]`);
      // Never print secret contents in error output
      const sanitizedErr = stderr.replace(new RegExp(value, "g"), "[REDACTED]");
      if (sanitizedErr.trim()) {
        console.error(`    Details: ${sanitizedErr.trim().split("\n")[0]}`);
      }
      results.failed.push(key);
    }
  }

  // Final summary
  console.log("\n=======================================================");
  console.log(" Import Summary");
  console.log("=======================================================");
  console.log(`  Environment: ${targetEnv}`);
  console.log(`  Successful:  ${results.success.length}`);
  console.log(`  Failed:      ${results.failed.length}`);
  console.log("=======================================================\n");

  if (results.failed.length > 0) {
    console.error("Some variables failed to import. Review errors above or add them manually in the Vercel Dashboard.");
    process.exit(1);
  } else {
    console.log("✔ All verified variables imported successfully.");
    console.log("Note: This script did NOT trigger a deployment. Deploy when ready via 'vercel --prod' or Git push.\n");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
