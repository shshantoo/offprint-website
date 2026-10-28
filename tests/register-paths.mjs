import { register } from "node:module";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();

const loaderCode = `
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = ${JSON.stringify(rootDir)};

function tryResolveTs(candidatePath) {
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return pathToFileURL(candidatePath).href;
  }
  if (fs.existsSync(candidatePath + ".ts")) {
    return pathToFileURL(candidatePath + ".ts").href;
  }
  if (fs.existsSync(candidatePath + ".tsx")) {
    return pathToFileURL(candidatePath + ".tsx").href;
  }
  if (fs.existsSync(path.join(candidatePath, "index.ts"))) {
    return pathToFileURL(path.join(candidatePath, "index.ts")).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = path.join(rootDir, "src", specifier.slice(2));
    const resolved = tryResolveTs(target);
    if (resolved) {
      return { url: resolved, shortCircuit: true };
    }
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL &&
    context.parentURL.startsWith("file:")
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const target = path.resolve(parentDir, specifier);
    const resolved = tryResolveTs(target);
    if (resolved) {
      return { url: resolved, shortCircuit: true };
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err && err.code === "ERR_MODULE_NOT_FOUND" && !specifier.endsWith(".js")) {
      return await nextResolve(specifier + ".js", context);
    }
    throw err;
  }
}
`;

register(
  `data:text/javascript;base64,${Buffer.from(loaderCode, "utf8").toString("base64")}`,
  pathToFileURL("./")
);
