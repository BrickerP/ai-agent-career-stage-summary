// Dependency-free validation for the public, sanitized career-stage summary.
//
// Checks that the published GitHub Pages build and data files are internally
// consistent, that Markdown links resolve, and that nothing which the
// sanitization rules exclude (private exports, env files, secrets, local
// absolute paths) has been committed.
//
// Usage: node scripts/validate-public.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(repoRoot, "docs");
const basePath = "/ai-agent-career-stage-summary/";
const errors = [];
let checks = 0;

function fail(message) {
  errors.push(message);
}

function check(condition, message) {
  checks += 1;
  if (!condition) fail(message);
}

function rel(path) {
  return relative(repoRoot, path) || ".";
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${rel(path)}: invalid JSON (${error.message})`);
    return undefined;
  }
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr}`);
  }
  return result.stdout.split("\0").filter(Boolean);
}

const files = trackedFiles();

// 1. Scripts parse.
for (const file of files.filter((f) => /^scripts\/.*\.m?js$/.test(f))) {
  const result = spawnSync(process.execPath, ["--check", join(repoRoot, file)], { encoding: "utf8" });
  check(result.status === 0, `${file}: syntax check failed\n${result.stderr}`);
}

// 2. Every tracked JSON file parses.
const json = new Map();
for (const file of files.filter((f) => f.endsWith(".json"))) {
  checks += 1;
  json.set(file, readJson(join(repoRoot, file)));
}

// 3. Dashboard graph integrity.
const graph = json.get("docs/knowledge-graph.json");
check(graph !== undefined, "docs/knowledge-graph.json is missing or invalid");
if (graph) {
  for (const key of ["version", "kind", "project", "nodes", "edges", "layers", "tour"]) {
    check(key in graph, `docs/knowledge-graph.json: missing top-level key "${key}"`);
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const layers = Array.isArray(graph.layers) ? graph.layers : [];
  const tour = Array.isArray(graph.tour) ? graph.tour : [];
  const ids = new Set();
  for (const node of nodes) {
    check(typeof node.id === "string" && node.id.length > 0, `graph node without id: ${JSON.stringify(node)}`);
    check(!ids.has(node.id), `graph: duplicate node id "${node.id}"`);
    ids.add(node.id);
    for (const key of ["type", "name", "summary"]) {
      check(typeof node[key] === "string" && node[key].length > 0, `graph node "${node.id}": missing ${key}`);
    }
    check(Array.isArray(node.tags), `graph node "${node.id}": tags must be an array`);
    check(
      typeof node.id === "string" && node.id.startsWith(`${node.type}:`),
      `graph node "${node.id}": id prefix does not match type "${node.type}"`,
    );
  }
  const edgeKeys = new Set();
  for (const edge of edges) {
    check(ids.has(edge.source), `graph edge: unknown source "${edge.source}"`);
    check(ids.has(edge.target), `graph edge: unknown target "${edge.target}"`);
    check(edge.source !== edge.target, `graph edge: self-loop on "${edge.source}"`);
    check(typeof edge.type === "string" && edge.type.length > 0, `graph edge ${edge.source} -> ${edge.target}: missing type`);
    check(
      typeof edge.weight === "number" && edge.weight >= 0 && edge.weight <= 1,
      `graph edge ${edge.source} -> ${edge.target}: weight must be a number in [0, 1]`,
    );
    const key = `${edge.source}|${edge.target}|${edge.type}`;
    check(!edgeKeys.has(key), `graph: duplicate edge ${key}`);
    edgeKeys.add(key);
  }
  const connected = new Set(edges.flatMap((e) => [e.source, e.target]));
  for (const id of ids) {
    check(connected.has(id), `graph node "${id}" has no edges`);
  }
  for (const layer of layers) {
    for (const id of layer.nodeIds ?? []) {
      check(ids.has(id), `graph layer "${layer.id}": unknown node "${id}"`);
    }
  }
  tour.forEach((stop, index) => {
    check(stop.order === index + 1, `graph tour: step ${index + 1} has order ${stop.order}`);
    for (const id of stop.nodeIds ?? []) {
      check(ids.has(id), `graph tour step ${stop.order}: unknown node "${id}"`);
    }
  });

  check(
    existsSync(join(docsDir, "domain-graph.json")) &&
      readFileSync(join(docsDir, "domain-graph.json"), "utf8") ===
        readFileSync(join(docsDir, "knowledge-graph.json"), "utf8"),
    "docs/domain-graph.json must be identical to docs/knowledge-graph.json (both are written by the build script)",
  );

  const meta = json.get("docs/meta.json");
  check(meta !== undefined, "docs/meta.json is missing or invalid");
  if (meta) {
    check(meta.analyzedFiles === nodes.length, `docs/meta.json: analyzedFiles ${meta.analyzedFiles} != ${nodes.length} graph nodes`);
    check(meta.gitCommitHash === graph.project?.gitCommitHash, "docs/meta.json: gitCommitHash does not match the graph");
  }
}

// 4. Public domain map integrity.
const domainMap = json.get("data/public-domain-map.json");
if (domainMap) {
  const domainIds = new Set();
  for (const domain of domainMap.domains ?? []) {
    check(!domainIds.has(domain.id), `data/public-domain-map.json: duplicate domain "${domain.id}"`);
    domainIds.add(domain.id);
  }
  for (const flow of domainMap.flows ?? []) {
    check(Array.isArray(flow) && flow.length === 2, `data/public-domain-map.json: malformed flow ${JSON.stringify(flow)}`);
    for (const id of flow) {
      check(domainIds.has(id), `data/public-domain-map.json: flow references unknown domain "${id}"`);
    }
  }
}

// 5. GitHub Pages build references resolve.
check(existsSync(join(docsDir, ".nojekyll")), "docs/.nojekyll is missing (GitHub Pages would run Jekyll)");
const indexPath = join(docsDir, "index.html");
check(existsSync(indexPath), "docs/index.html is missing");
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf8");
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(url)) continue;
    check(url.startsWith(basePath), `docs/index.html: local URL "${url}" is not under ${basePath}`);
    const target = join(docsDir, url.slice(basePath.length).split(/[?#]/)[0]);
    check(existsSync(target), `docs/index.html: referenced file ${rel(target)} does not exist`);
  }
}
for (const file of files.filter((f) => /^docs\/assets\/.*\.(js|css)$/.test(f))) {
  const text = readFileSync(join(repoRoot, file), "utf8");
  for (const [, name] of text.matchAll(/assets\/([A-Za-z0-9_.-]+\.(?:js|css|svg|png|woff2?))/g)) {
    check(existsSync(join(docsDir, "assets", name)), `${file}: references missing asset assets/${name}`);
  }
}

// 6. Relative Markdown links resolve.
for (const file of files.filter((f) => f.endsWith(".md"))) {
  const text = readFileSync(join(repoRoot, file), "utf8");
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^([a-z]+:|#)/i.test(target)) continue;
    const path = join(repoRoot, dirname(file), decodeURIComponent(target.split("#")[0]));
    check(existsSync(path), `${file}: broken link to "${target}"`);
  }
}

// 7. Sanitization guard.
const forbiddenFiles = [
  [/^knowledge-graph\.json$/, "raw private knowledge-graph export"],
  [/(^|\/)analysis-summary\.json$/, "raw analysis export"],
  [/(^|\/)repo-clone-validation\.tsv$/, "raw clone validation export"],
  [/(^|\/)\.understand-anything\//, "private Understand-Anything workspace"],
  [/(^|\/)\.env($|\.)/, "environment file"],
  [/(^|\/)node_modules\//, "node_modules"],
  [/\.(pem|key|p12|pfx)$/, "key material"],
  [/\.map$/, "source map (can leak source paths)"],
];
for (const file of files) {
  for (const [pattern, why] of forbiddenFiles) {
    check(!pattern.test(file), `${file}: must not be committed (${why})`);
  }
}

const forbiddenContent = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/, "GitHub token"],
  [/\bgithub_pat_[A-Za-z0-9_]{40,}\b/, "GitHub fine-grained token"],
  [/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}\b/, "API secret key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key id"],
  [/\bxox[abpors]-[A-Za-z0-9-]{10,}\b/, "Slack token"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key"],
  [/(?:^|[\s"'`(=])\/Users\/[A-Za-z0-9._-]+\//, "local macOS home path"],
  [/(?:^|[\s"'`(=])\/home\/[a-z0-9._-]+\//, "local Linux home path"],
  [/[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/, "local Windows home path"],
];
const binary = /\.(ico|png|jpe?g|gif|webp|woff2?|ttf|otf|pdf)$/i;
for (const file of files.filter((f) => !binary.test(f))) {
  const text = readFileSync(join(repoRoot, file), "utf8");
  for (const [pattern, why] of forbiddenContent) {
    checks += 1;
    const match = text.match(pattern);
    if (match) {
      const line = text.slice(0, match.index).split("\n").length;
      fail(`${file}:${line}: looks like a ${why}; public content must stay sanitized`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`OK: ${checks} checks passed across ${files.length} tracked files.`);
