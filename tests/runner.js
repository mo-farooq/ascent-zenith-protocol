#!/usr/bin/env node

/**
 * Ascent: Zenith Protocol - E2E 4-Tier Automated Test Runner
 *
 * Headless, CI-ready test runner executing all 4 tiers of opaque-box tests.
 * Exits with code 0 on 100% pass, or code 1 on test failure.
 *
 * Usage:
 *   node tests/runner.js                 # Run all 4 tiers
 *   node tests/runner.js --tier=1        # Run Tier 1 Feature Coverage
 *   node tests/runner.js --tier=2        # Run Tier 2 Boundary & Corner Cases
 *   node tests/runner.js --tier=3        # Run Tier 3 Cross-Feature Combos
 *   node tests/runner.js --tier=4        # Run Tier 4 Real-World Scenarios
 *   node tests/runner.js --filter=<pat>  # Run matching test files
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Parse CLI flags
const args = process.argv.slice(2);
let tierFilter = null;
let nameFilter = null;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    tierFilter = arg.split('=')[1].trim();
  } else if (arg.startsWith('--filter=')) {
    nameFilter = arg.split('=')[1].trim();
  }
}

// Discover all test files by tier
const tierDirs = {
  '1': path.join(__dirname, 'e2e', 'tier1-features'),
  '2': path.join(__dirname, 'e2e', 'tier2-boundaries'),
  '3': path.join(__dirname, 'e2e', 'tier3-combinations'),
  '4': path.join(__dirname, 'e2e', 'tier4-scenarios'),
};

const tierNames = {
  '1': 'Tier 1: Feature Coverage',
  '2': 'Tier 2: Boundary & Corner Cases',
  '3': 'Tier 3: Cross-Feature Combinations',
  '4': 'Tier 4: Real-World Scenarios',
};

const selectedFiles = [];

for (const [tier, dir] of Object.entries(tierDirs)) {
  if (tierFilter && tierFilter !== tier) continue;
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.test.ts'))
    .filter(f => !nameFilter || f.includes(nameFilter))
    .map(f => path.join(dir, f));

  selectedFiles.push(...files);
}

if (selectedFiles.length === 0) {
  console.error(`[TEST RUNNER] No test files matched criteria (tierFilter=${tierFilter}, nameFilter=${nameFilter})`);
  process.exit(1);
}

console.log('='.repeat(72));
console.log(' ASCENT: ZENITH PROTOCOL - E2E TEST RUNNER');
console.log('='.repeat(72));
console.log(` Target files: ${selectedFiles.length} suites`);
if (tierFilter) console.log(` Active tier: ${tierFilter} (${tierNames[tierFilter]})`);
console.log('-'.repeat(72));

const registerPath = path.join(__dirname, 'register.js');
const nodeArgs = [
  '--no-deprecation',
  '--import', registerPath,
  '--test',
  ...selectedFiles
];

const startTime = Date.now();
const child = spawn(process.execPath, nodeArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});

child.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('-'.repeat(72));
  if (code === 0) {
    console.log(`[TEST RUNNER] ALL TEST SUITES PASSED in ${duration}s (Exit code 0)`);
  } else {
    console.log(`[TEST RUNNER] TEST FAILURES DETECTED in ${duration}s (Exit code ${code})`);
  }
  console.log('='.repeat(72));
  process.exit(code ?? 1);
});
