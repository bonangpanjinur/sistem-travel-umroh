#!/usr/bin/env node
/**
 * validate-migrations.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Dry-run validator for SQL migration files.
 *
 * What it checks:
 *   1. FK Dependency Order  — a table must be defined BEFORE any table that
 *                             references it. Reports every violation with the
 *                             offending line numbers.
 *   2. Circular References  — detects cycles in the dependency graph using
 *                             DFS (depth-first search) and prints the full
 *                             cycle path.
 *   3. Dangling References  — a REFERENCES clause pointing to a table that
 *                             is never defined in the scanned files (and is
 *                             not an external/system schema like auth.*).
 *
 * Usage:
 *   node scripts/validate-migrations.mjs                       # default: MASTER_MIGRATION.sql
 *   node scripts/validate-migrations.mjs path/to/file.sql      # single file
 *   node scripts/validate-migrations.mjs --dir migrations/     # all .sql in dir (sorted)
 *   node scripts/validate-migrations.mjs a.sql b.sql c.sql     # explicit ordered list
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more errors found
 */

import fs   from "fs";
import path from "path";

// ─── ANSI colour helpers ──────────────────────────────────────────────────────
const isTTY = process.stdout.isTTY;
const c = {
  reset:  isTTY ? "\x1b[0m"  : "",
  bold:   isTTY ? "\x1b[1m"  : "",
  red:    isTTY ? "\x1b[31m" : "",
  green:  isTTY ? "\x1b[32m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  cyan:   isTTY ? "\x1b[36m" : "",
  grey:   isTTY ? "\x1b[90m" : "",
};
const bold   = (s) => `${c.bold}${s}${c.reset}`;
const red    = (s) => `${c.red}${s}${c.reset}`;
const green  = (s) => `${c.green}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const cyan   = (s) => `${c.cyan}${s}${c.reset}`;
const grey   = (s) => `${c.grey}${s}${c.reset}`;

// ─── Schemas / tables that are external (always treated as pre-existing) ──────
const EXTERNAL_SCHEMAS = new Set(["auth", "storage", "realtime", "extensions", "vault"]);

function isExternal(tableName) {
  const dot = tableName.indexOf(".");
  return dot !== -1 && EXTERNAL_SCHEMAS.has(tableName.slice(0, dot));
}

// ─── SQL PARSER ───────────────────────────────────────────────────────────────
/**
 * Parses one SQL string (content of a file with absolute line offset).
 * Returns:
 *   tableDefs:   Map<tableName, { line, file }>
 *   dependencies: Array<{ from, to, line, file, context }>
 *     from → table being defined (or altered)
 *     to   → table being referenced
 */
function parseSql(content, filePath, lineOffset = 0) {
  const tableDefs   = new Map();   // tableName → { line, file }
  const dependencies = [];          // { from, to, line, file, context }

  const lines = content.split("\n");

  // Strip block comments (/* … */) keeping line count intact
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " ")
  );
  // Strip line comments (-- …) keeping newlines
  const clean = stripped.replace(/--.*/g, "");

  // Tokenise: we'll walk statement-by-statement
  // Split on semicolons to get statements, tracking line numbers
  let pos = 0;
  const stmtBoundaries = [];
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === ";") {
      stmtBoundaries.push({ start: pos, end: i, text: clean.slice(pos, i) });
      pos = i + 1;
    }
  }
  if (pos < clean.length) {
    stmtBoundaries.push({ start: pos, end: clean.length, text: clean.slice(pos) });
  }

  // Map character positions → line numbers (1-based)
  const charToLine = buildCharToLine(clean);

  for (const { start, text } of stmtBoundaries) {
    const stmt = text.trim();
    if (!stmt) continue;

    const stmtStartLine = lineOffset + charToLine[start] + 1;

    // ── CREATE TABLE ──────────────────────────────────────────────────────────
    const ctMatch = stmt.match(
      /CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s*\(/i
    );
    if (ctMatch) {
      const schema    = ctMatch[1] ? ctMatch[1].toLowerCase() : null;
      const tableName = ctMatch[2].toLowerCase();
      const fullName  = schema ? `${schema}.${tableName}` : tableName;

      if (!isExternal(fullName)) {
        if (!tableDefs.has(fullName)) {
          tableDefs.set(fullName, { line: stmtStartLine, file: filePath });
        }
      }

      // Extract all REFERENCES inside this CREATE TABLE body
      const bodyMatch = stmt.match(/CREATE\s+(?:UNLOGGED\s+)?TABLE[^(]+\(([\s\S]*)/i);
      if (bodyMatch) {
        extractRefs(bodyMatch[1], fullName, filePath, stmtStartLine, clean, start, charToLine, lineOffset, dependencies);
      }
      continue;
    }

    // ── ALTER TABLE … ADD COLUMN … REFERENCES ────────────────────────────────
    const atColMatch = stmt.match(
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s+ADD\s+(?:COLUMN\s+)?[^;]+REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(/i
    );
    if (atColMatch) {
      const fromSchema = atColMatch[1] ? atColMatch[1].toLowerCase() : null;
      const fromTable  = atColMatch[2].toLowerCase();
      const toSchema   = atColMatch[3] ? atColMatch[3].toLowerCase() : null;
      const toTable    = atColMatch[4].toLowerCase();
      const from = fromSchema ? `${fromSchema}.${fromTable}` : fromTable;
      const to   = toSchema   ? `${toSchema}.${toTable}`   : toTable;
      if (!isExternal(to) && !isExternal(from)) {
        dependencies.push({ from, to, line: stmtStartLine, file: filePath, context: stmt.slice(0, 120).replace(/\s+/g, " ") });
      }
      continue;
    }

    // ── ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY ───────────────────────────
    const atFkMatch = stmt.match(
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(/i
    );
    if (atFkMatch) {
      const fromSchema = atFkMatch[1] ? atFkMatch[1].toLowerCase() : null;
      const fromTable  = atFkMatch[2].toLowerCase();
      const toSchema   = atFkMatch[3] ? atFkMatch[3].toLowerCase() : null;
      const toTable    = atFkMatch[4].toLowerCase();
      const from = fromSchema ? `${fromSchema}.${fromTable}` : fromTable;
      const to   = toSchema   ? `${toSchema}.${toTable}`   : toTable;
      if (!isExternal(to) && !isExternal(from)) {
        dependencies.push({ from, to, line: stmtStartLine, file: filePath, context: stmt.slice(0, 120).replace(/\s+/g, " ") });
      }
    }
  }

  return { tableDefs, dependencies };
}

/**
 * Extract all REFERENCES clauses from a CREATE TABLE body.
 * Handles both inline column FKs and table-level FOREIGN KEY constraints.
 */
function extractRefs(body, fromTable, filePath, stmtLine, fullClean, stmtStart, charToLine, lineOffset, out) {
  // inline:       col_name  TYPE  REFERENCES  target_table (col)
  // table-level:  FOREIGN KEY (col) REFERENCES target_table (col)
  const refRe = /REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(/gi;
  let m;
  while ((m = refRe.exec(body)) !== null) {
    const toSchema = m[1] ? m[1].toLowerCase() : null;
    const toTable  = m[2].toLowerCase();
    const to = toSchema ? `${toSchema}.${toTable}` : toTable;

    if (isExternal(to)) continue;
    if (to === fromTable) continue; // self-reference (ok, but flag separately)

    out.push({
      from: fromTable,
      to,
      line: stmtLine,
      file: filePath,
      context: body.slice(Math.max(0, m.index - 60), m.index + 80).replace(/\s+/g, " ").trim(),
    });
  }
}

function buildCharToLine(text) {
  const map = new Array(text.length).fill(0);
  let line = 0;
  for (let i = 0; i < text.length; i++) {
    map[i] = line;
    if (text[i] === "\n") line++;
  }
  return map;
}

// ─── GRAPH ALGORITHMS ─────────────────────────────────────────────────────────

/**
 * Topological order check + cycle detection (DFS, three-colour).
 * Returns { cycles: string[][] } where each inner array is a cycle path.
 */
function detectCycles(nodes, edges) {
  // edges: Map<from, Set<to>>
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map();
  const parent = new Map();
  const cycles = [];

  for (const n of nodes) color.set(n, WHITE);

  function dfs(u) {
    color.set(u, GREY);
    const nbrs = edges.get(u) || new Set();
    for (const v of nbrs) {
      if (!color.has(v)) continue; // external node, skip
      if (color.get(v) === GREY) {
        // Found a back-edge u → v: reconstruct cycle
        const cycle = [v];
        let cur = u;
        while (cur !== v) {
          cycle.push(cur);
          cur = parent.get(cur);
          if (!cur) break;
        }
        cycle.push(v);
        cycle.reverse();
        cycles.push(cycle);
      } else if (color.get(v) === WHITE) {
        parent.set(v, u);
        dfs(v);
      }
    }
    color.set(u, BLACK);
  }

  for (const n of nodes) {
    if (color.get(n) === WHITE) dfs(n);
  }

  return cycles;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function resolveInputFiles(args) {
  const dirIdx = args.indexOf("--dir");
  if (dirIdx !== -1) {
    const dir = args[dirIdx + 1];
    if (!dir || !fs.existsSync(dir)) {
      console.error(red(`Directory not found: ${dir}`));
      process.exit(1);
    }
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => path.join(dir, f));
  }

  const fileArgs = args.filter((a) => !a.startsWith("--"));
  if (fileArgs.length > 0) return fileArgs;

  // Default
  const defaultFile = "supabase_clean_migration/MASTER_MIGRATION.sql";
  if (fs.existsSync(defaultFile)) return [defaultFile];

  console.error(red("No SQL file specified and default not found."));
  console.error(grey("Usage: node scripts/validate-migrations.mjs [file.sql | --dir migrations/]"));
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const files = resolveInputFiles(args);

  console.log(bold("\n╔══════════════════════════════════════════════════════════════╗"));
  console.log(bold("║        SQL Migration FK Dependency Validator                 ║"));
  console.log(bold("╚══════════════════════════════════════════════════════════════╝\n"));
  console.log(`${grey("Files scanned:")} ${files.length}`);
  files.forEach((f) => console.log(`  ${grey("→")} ${cyan(f)}`));
  console.log();

  // ── Parse all files ──────────────────────────────────────────────────────────
  const allTableDefs   = new Map();     // tableName → { line, file }
  const allDependencies = [];            // { from, to, line, file, context }
  const tableOrder     = [];            // ordered list of tables (insertion order)

  let lineOffset = 0;
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.error(red(`File not found: ${filePath}`));
      process.exit(1);
    }
    const content = fs.readFileSync(filePath, "utf8");
    const { tableDefs, dependencies } = parseSql(content, filePath, lineOffset);

    for (const [name, meta] of tableDefs) {
      if (!allTableDefs.has(name)) {
        allTableDefs.set(name, meta);
        tableOrder.push(name);
      }
    }
    allDependencies.push(...dependencies);

    lineOffset += content.split("\n").length;
  }

  const totalTables = allTableDefs.size;
  const totalFKs    = allDependencies.length;

  console.log(`${bold("Tables found:")}  ${cyan(totalTables)}`);
  console.log(`${bold("FK edges found:")} ${cyan(totalFKs)}\n`);

  // ── Build adjacency structures ────────────────────────────────────────────────
  // depEdges: from → Set<to>   (from depends on to)
  const depEdges = new Map();
  for (const t of tableOrder) depEdges.set(t, new Set());
  for (const { from, to } of allDependencies) {
    if (!depEdges.has(from)) depEdges.set(from, new Set());
    if (allTableDefs.has(to)) depEdges.get(from).add(to);
  }

  let errorCount   = 0;
  let warningCount = 0;

  // ════════════════════════════════════════════════════════════════════════════
  // CHECK 1: FK Dependency Order Violations
  // ════════════════════════════════════════════════════════════════════════════
  console.log(bold("━━━  CHECK 1: FK Dependency Order  ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  const tablePosition = new Map(tableOrder.map((t, i) => [t, i]));
  const orderViolations = [];

  for (const dep of allDependencies) {
    const { from, to, line, file, context } = dep;
    if (isExternal(to)) continue;
    if (!allTableDefs.has(to)) continue; // dangling — caught in check 3

    const posFrom = tablePosition.get(from);
    const posTo   = tablePosition.get(to);

    if (posFrom === undefined || posTo === undefined) continue;
    if (posFrom < posTo) {
      // "from" is defined before "to", but "from" depends on "to" → VIOLATION
      orderViolations.push({ from, to, line, file, context, posFrom, posTo });
    }
  }

  if (orderViolations.length === 0) {
    console.log(green("  ✓  No order violations found. All referenced tables are defined first.\n"));
  } else {
    errorCount += orderViolations.length;
    console.log(red(`  ✗  ${orderViolations.length} order violation(s) found:\n`));
    for (const v of orderViolations) {
      const fromMeta = allTableDefs.get(v.from);
      const toMeta   = allTableDefs.get(v.to);
      console.log(`  ${red("ERROR")}  ${bold(v.from)} ${grey("(defined at line")} ${yellow(fromMeta?.line)} ${grey(")")} references ${bold(v.to)} ${grey("(defined later at line")} ${yellow(toMeta?.line)} ${grey(")")}`);
      console.log(`         ${grey("File:")} ${cyan(v.file)}  ${grey("FK at line:")} ${yellow(v.line)}`);
      console.log(`         ${grey("Context:")} ${v.context.slice(0, 100)}`);
      console.log();
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECK 2: Circular References (Cycles)
  // ════════════════════════════════════════════════════════════════════════════
  console.log(bold("━━━  CHECK 2: Circular References  ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  const cycles = detectCycles(new Set(tableOrder), depEdges);

  if (cycles.length === 0) {
    console.log(green("  ✓  No circular references detected. Dependency graph is a DAG.\n"));
  } else {
    errorCount += cycles.length;
    console.log(red(`  ✗  ${cycles.length} cycle(s) detected:\n`));
    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      console.log(`  ${red(`Cycle ${i + 1}:`)}  ${cycle.map((t) => bold(t)).join(red(" → "))}`);
      console.log(`         Each table in the cycle has a FK pointing to the next.`);
      console.log(`         ${yellow("Fix:")} Break the cycle by making one FK deferrable or by restructuring.`);
      console.log();
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECK 3: Dangling References (FK to undefined table)
  // ════════════════════════════════════════════════════════════════════════════
  console.log(bold("━━━  CHECK 3: Dangling References  ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  const danglingMap = new Map(); // to → [{ from, line, file }]
  for (const dep of allDependencies) {
    if (isExternal(dep.to)) continue;
    if (!allTableDefs.has(dep.to)) {
      if (!danglingMap.has(dep.to)) danglingMap.set(dep.to, []);
      danglingMap.get(dep.to).push(dep);
    }
  }

  if (danglingMap.size === 0) {
    console.log(green("  ✓  No dangling references. Every REFERENCES target is defined.\n"));
  } else {
    warningCount += danglingMap.size;
    console.log(yellow(`  ⚠  ${danglingMap.size} undefined table(s) referenced:\n`));
    for (const [missing, refs] of danglingMap) {
      console.log(`  ${yellow("WARN")}  Table ${bold(missing)} is referenced but never defined in scanned files.`);
      for (const r of refs.slice(0, 3)) {
        console.log(`         ${grey("←")} from ${bold(r.from)}  ${grey("at line")} ${yellow(r.line)}  ${grey("in")} ${cyan(r.file)}`);
      }
      if (refs.length > 3) console.log(`         ${grey(`... and ${refs.length - 3} more`)}`);
      console.log();
    }
    console.log(grey("  Note: These may be defined in other migration files not scanned, or created"));
    console.log(grey("        by extensions. Use --dir to scan all files together.\n"));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECK 4: Self-References (informational)
  // ════════════════════════════════════════════════════════════════════════════
  console.log(bold("━━━  CHECK 4: Self-References (informational)  ━━━━━━━━━━━━━━━\n"));

  const selfRefs = new Set();
  for (const dep of allDependencies) {
    if (dep.from === dep.to) selfRefs.add(dep.from);
  }

  if (selfRefs.size === 0) {
    console.log(grey("  —  No self-referencing tables found.\n"));
  } else {
    console.log(cyan(`  ℹ  ${selfRefs.size} self-referencing table(s) (adjacency/tree patterns):`));
    for (const t of selfRefs) {
      const meta = allTableDefs.get(t);
      console.log(`     ${bold(t)} ${grey(`(line ${meta?.line}, file ${meta?.file})`)}`);
    }
    console.log(grey("\n  Self-references are valid in PostgreSQL but require deferrable constraints"));
    console.log(grey("  (or SET NULL) if you INSERT parent and child in the same transaction.\n"));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DEPENDENCY REPORT: Most-depended-on tables (informational)
  // ════════════════════════════════════════════════════════════════════════════
  console.log(bold("━━━  Dependency Report: Most-Referenced Tables  ━━━━━━━━━━━━━━\n"));

  const refCount = new Map();
  for (const dep of allDependencies) {
    if (isExternal(dep.to) || dep.from === dep.to) continue;
    refCount.set(dep.to, (refCount.get(dep.to) || 0) + 1);
  }
  const topRefs = [...refCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [table, count] of topRefs) {
    const bar = "█".repeat(Math.min(count, 40));
    const meta = allTableDefs.get(table);
    const lineInfo = meta ? grey(` (line ${meta.line})`) : "";
    console.log(`  ${bold(table.padEnd(40))} ${cyan(String(count).padStart(3))} refs  ${grey(bar)}${lineInfo}`);
  }
  console.log();

  // ════════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log(bold("━━━  Summary  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
  console.log(`  Tables scanned:     ${cyan(totalTables)}`);
  console.log(`  FK edges parsed:    ${cyan(totalFKs)}`);
  console.log(`  Errors found:       ${errorCount > 0 ? red(errorCount) : green(errorCount)}`);
  console.log(`  Warnings found:     ${warningCount > 0 ? yellow(warningCount) : green(warningCount)}`);
  console.log();

  if (errorCount === 0 && warningCount === 0) {
    console.log(green(bold("  ✓  ALL CHECKS PASSED — safe to apply migrations.\n")));
    process.exit(0);
  } else if (errorCount === 0) {
    console.log(yellow(bold(`  ⚠  PASSED WITH WARNINGS — review ${warningCount} warning(s) above.\n`)));
    process.exit(0);
  } else {
    console.log(red(bold(`  ✗  FAILED — fix ${errorCount} error(s) before applying migrations.\n`)));
    process.exit(1);
  }
}

main();
