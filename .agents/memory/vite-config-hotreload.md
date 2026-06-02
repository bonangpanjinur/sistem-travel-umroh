---
name: vite.config.ts hot-reload crash
description: Changing vite.config.ts while the dev server is running causes "Cannot find package vite" crash; needs full restart + install.
---

## Problem
When `vite.config.ts` is changed in the dev environment, Vite tries to hot-reload its own config. This fails with:
`Cannot find package 'vite' imported from /home/runner/workspace/artifacts/umrah-haji/node_modules/.vite-temp/vite.config.ts.timestamp-....mjs`

This causes the workflow to go into a failed state. Subsequent `restart_workflow` calls also fail because the packages aren't installed.

## Fix
1. Run `pnpm install --filter @workspace/umrah-haji` from the workspace root to re-link all dependencies.
2. Then `restart_workflow` succeeds.

**Why:** The pnpm workspace structure doesn't install `vite` into `artifacts/umrah-haji/node_modules/` directly — it uses hoisting. When Vite tries to resolve its own package in the temp directory, the path resolution fails. A fresh `pnpm install` re-creates the correct symlinks.

**How to apply:** If the `artifacts/umrah-haji: web` workflow fails with "vite not found" or "Cannot find package vite", run `pnpm install --filter @workspace/umrah-haji` first, then restart.
