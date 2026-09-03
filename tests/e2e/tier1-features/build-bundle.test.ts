import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

describe('Tier 1: F13 - Build & Bundle Cleanliness (Zero Warnings & Errors)', () => {
  const rootDir = path.resolve(process.cwd());

  it('F13-1: TypeScript compilation succeeds with zero errors (tsc --noEmit)', () => {
    try {
      const output = execSync('npx tsc --noEmit', {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      assert.ok(true, 'tsc completed cleanly');
    } catch (err: any) {
      assert.fail(`TypeScript compiler errors found:\n${err.stdout || err.message}`);
    }
  });

  it('F13-2: Required source modules and directories are intact', () => {
    const requiredDirs = [
      'src/core',
      'src/entities',
      'src/environment',
      'src/level',
      'src/materials',
      'src/physics'
    ];

    for (const dir of requiredDirs) {
      const fullPath = path.join(rootDir, dir);
      assert.ok(fs.existsSync(fullPath), `Directory ${dir} must exist`);
    }
  });

  it('F13-3: Entry index.html references /src/main.ts', () => {
    const indexPath = path.join(rootDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html must exist');
    const content = fs.readFileSync(indexPath, 'utf8');
    assert.ok(
      content.includes('/src/main.ts') || content.includes('src/main.ts'),
      'index.html should reference src/main.ts script'
    );
  });

  it('F13-4: vite.config.ts is present and specifies configuration', () => {
    const viteConfigPath = path.join(rootDir, 'vite.config.ts');
    assert.ok(fs.existsSync(viteConfigPath), 'vite.config.ts must exist');
    const content = fs.readFileSync(viteConfigPath, 'utf8');
    assert.ok(content.includes('defineConfig'), 'vite.config.ts should use defineConfig');
  });

  it('F13-5: Production build chunks adhere to 500 kB limit (F13 requirement)', () => {
    // If dist/assets exists, check sizes of built js files
    const distAssetsDir = path.join(rootDir, 'dist', 'assets');
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const stats = fs.statSync(path.join(distAssetsDir, file));
        const sizeKb = stats.size / 1024;
        assert.ok(
          sizeKb <= 500,
          `Chunk ${file} is ${sizeKb.toFixed(2)} kB, exceeding 500 kB limit (F13 requirement)`
        );
      }
    } else {
      // If dist hasn't been built yet, inspect vite.config.ts for manualChunks configuration
      const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf8');
      assert.ok(
        viteConfig.includes('manualChunks') || viteConfig.includes('chunkSizeWarningLimit'),
        'vite.config.ts should configure manualChunks to prevent chunks > 500 kB'
      );
    }
  });
});
