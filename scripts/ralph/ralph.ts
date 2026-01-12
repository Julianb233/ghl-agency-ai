#!/usr/bin/env npx tsx
/**
 * Ralph - Autonomous task execution agent
 * Runs Amp iterations to complete tasks from a parent task
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const RALPH_DIR = __dirname;
const PARENT_TASK_FILE = join(RALPH_DIR, 'parent-task-id.txt');
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

function getParentTaskId(): string {
  if (!existsSync(PARENT_TASK_FILE)) {
    throw new Error(`Parent task ID file not found: ${PARENT_TASK_FILE}`);
  }
  return readFileSync(PARENT_TASK_FILE, 'utf-8').trim();
}

async function runAmpIteration(parentId: string): Promise<{ complete: boolean; output: string }> {
  return new Promise((resolve, reject) => {
    const prompt = `You are Ralph, an autonomous agent completing tasks.

Parent task ID: ${parentId}

Instructions:
1. Use \`amp task list --parentID ${parentId} --limit 5\` to find ready tasks
2. Pick one task that has no incomplete dependencies
3. Complete the task fully (implement, test, verify)
4. Mark it complete with \`amp task update <id> --status completed\`
5. If ALL subtasks are done, mark the parent complete and output: <promise>COMPLETE</promise>

Run \`pnpm run check\` before marking any task complete.`;

    const amp = spawn('amp', ['--prompt', prompt], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

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
      const complete = output.includes('<promise>COMPLETE</promise>');
      resolve({ complete, output });
    });

    amp.on('error', reject);
  });
}

async function main() {
  const maxIterations = parseInt(process.argv[2] || '10', 10);
  
  log(`Ralph starting with max ${maxIterations} iterations`);
  
  const parentId = getParentTaskId();
  log(`Parent task: ${parentId}`);

  for (let i = 1; i <= maxIterations; i++) {
    log(`\n=== Iteration ${i}/${maxIterations} ===`);
    
    try {
      const result = await runAmpIteration(parentId);
      
      if (result.complete) {
        log('🎉 All tasks complete! Ralph finished.');
        process.exit(0);
      }
    } catch (error) {
      log(`Error in iteration ${i}: ${error}`);
    }
  }

  log(`Reached max iterations (${maxIterations}). Some tasks may remain.`);
}

main().catch(console.error);
