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
const PRD_JSON_FILE = join(RALPH_DIR, 'current-prd.json');
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

interface PRDTask {
  id: string;
  title: string;
  status: string;
  description: string;
  dependsOn?: string[];
}

interface PRDConfig {
  name: string;
  tasks: PRDTask[];
}

function getPRDPath(): string {
  if (!existsSync(PRD_FILE)) {
    return 'tasks/prd-asset-mcp.json';
  }
  return readFileSync(PRD_FILE, 'utf-8').trim();
}

function loadPRDJson(path: string): PRDConfig | null {
  try {
    if (path.endsWith('.json') && existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      return JSON.parse(content) as PRDConfig;
    }
  } catch {
    return null;
  }
  return null;
}

function getNextTask(prd: PRDConfig): PRDTask | null {
  const completedIds = new Set(
    prd.tasks.filter(t => t.status === 'completed').map(t => t.id)
  );
  
  for (const task of prd.tasks) {
    if (task.status === 'completed') continue;
    
    const deps = task.dependsOn || [];
    const allDepsComplete = deps.every(dep => completedIds.has(dep));
    
    if (allDepsComplete) {
      return task;
    }
  }
  return null;
}

async function runAmpIteration(prdPath: string, iteration: number, task?: PRDTask): Promise<{ complete: boolean; output: string }> {
  return new Promise((resolve, reject) => {
    let prompt: string;
    
    if (task) {
      prompt = `You are Ralph, an autonomous agent completing PRD tasks.

PRD File: ${prdPath}
Iteration: ${iteration}

## CURRENT TASK: ${task.id} - ${task.title}

${task.description}

## Instructions:
1. Implement this task completely (create files, write code, test)
2. Run \`pnpm run check\` to verify TypeScript passes
3. After completing, update the PRD JSON file to mark this task status as "completed"
4. If this was the LAST pending task, output exactly: RALPH_ALL_COMPLETE

Be thorough. Do not ask questions - make reasonable decisions and proceed.`;
    } else {
      prompt = `You are Ralph, an autonomous agent completing PRD tasks.

PRD File: ${prdPath}
Iteration: ${iteration}

Instructions:
1. Read the PRD file at ${prdPath}
2. Find the FIRST task that is NOT marked as "completed" and has all dependencies complete
3. Implement that task completely (create files, write code, test)
4. Update the PRD to mark the task as "completed"
5. Run \`pnpm run check\` to verify TypeScript passes
6. If ALL tasks in the PRD are complete, output exactly: RALPH_ALL_COMPLETE

Be thorough. Complete one task fully before moving on.
Do not ask questions - make reasonable decisions and proceed.`;
    }

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
  
  // Load PRD JSON if available
  const prd = loadPRDJson(prdPath);
  if (prd) {
    log(`Loaded PRD: ${prd.name} with ${prd.tasks.length} tasks`);
    const completed = prd.tasks.filter(t => t.status === 'completed').length;
    const pending = prd.tasks.length - completed;
    log(`Status: ${completed} completed, ${pending} pending`);
  }

  for (let i = 1; i <= maxIterations; i++) {
    log(`\n=== Iteration ${i}/${maxIterations} ===`);
    
    try {
      // If JSON PRD, find next task
      let nextTask: PRDTask | undefined;
      if (prd) {
        const task = getNextTask(prd);
        if (!task) {
          log('🎉 All PRD tasks complete! Ralph finished.');
          process.exit(0);
        }
        nextTask = task;
        log(`Working on: ${task.id} - ${task.title}`);
      }
      
      const result = await runAmpIteration(prdPath, i, nextTask);
      
      if (result.complete) {
        log('🎉 All PRD tasks complete! Ralph finished.');
        process.exit(0);
      }
      
      // Reload PRD to check updated status
      if (prd && existsSync(prdPath)) {
        const updated = loadPRDJson(prdPath);
        if (updated) {
          Object.assign(prd, updated);
        }
      }
    } catch (error) {
      log(`Error in iteration ${i}: ${error}`);
    }
  }

  log(`Reached max iterations (${maxIterations}). Some tasks may remain.`);
}

main().catch(console.error);
