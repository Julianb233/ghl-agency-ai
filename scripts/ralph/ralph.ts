#!/usr/bin/env npx tsx
/**
 * Ralph - Autonomous task execution agent
 * Runs Amp iterations to complete tasks from a PRD file
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RALPH_DIR = __dirname;
const PRD_FILE = join(RALPH_DIR, 'current-prd.txt');
const PROGRESS_FILE = join(RALPH_DIR, 'progress.txt');

function log(msg: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
  appendProgress(`[${timestamp}] ${msg}`);
}

function appendProgress(msg: string) {
  if (existsSync(PROGRESS_FILE)) {
    const content = readFileSync(PROGRESS_FILE, 'utf-8');
    writeFileSync(PROGRESS_FILE, content + '\n' + msg);
  }
}

function getPRDPath(): string {
  if (!existsSync(PRD_FILE)) {
    // Default to launch readiness PRD
    return 'tasks/prd-launch-readiness.md';
  }
  return readFileSync(PRD_FILE, 'utf-8').trim();
}

async function runAmpIteration(prdPath: string, iteration: number): Promise<{ complete: boolean; output: string }> {
  return new Promise((resolve, reject) => {
    const prompt = `You are Ralph, an autonomous agent completing PRD tasks.

PRD File: ${prdPath}
Iteration: ${iteration}

Instructions:
1. Read the PRD file at ${prdPath}
2. Find the FIRST user story that is NOT marked with "✅ COMPLETE"
3. Implement that story completely (create files, write code, test)
4. Update the PRD to mark the story as complete with "✅ COMPLETE"
5. Run \`pnpm run check\` to verify TypeScript passes
6. If ALL stories in the PRD are complete, output exactly: RALPH_ALL_COMPLETE

Be thorough. Complete one story fully before moving on.
Do not ask questions - make reasonable decisions and proceed.`;

    // Use echo to pipe prompt to amp with -x flag
    const amp = spawn('amp', ['-x', '--dangerously-allow-all'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Write prompt to stdin
    amp.stdin.write(prompt);
    amp.stdin.end();

    let output = '';
    
    amp.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    amp.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    amp.on('close', (code) => {
      const complete = output.includes('RALPH_ALL_COMPLETE');
      resolve({ complete, output });
    });

    amp.on('error', reject);
  });
}

async function main() {
  const maxIterations = parseInt(process.argv[2] || '10', 10);
  
  log(`Ralph starting with max ${maxIterations} iterations`);
  
  const prdPath = getPRDPath();
  log(`PRD: ${prdPath}`);

  for (let i = 1; i <= maxIterations; i++) {
    log(`\n=== Iteration ${i}/${maxIterations} ===`);
    
    try {
      const result = await runAmpIteration(prdPath, i);
      
      if (result.complete) {
        log('🎉 All PRD tasks complete! Ralph finished.');
        process.exit(0);
      }
    } catch (error) {
      log(`Error in iteration ${i}: ${error}`);
    }
  }

  log(`Reached max iterations (${maxIterations}). Some tasks may remain.`);
}

main().catch(console.error);
