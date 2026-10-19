// One-command deploy: rebuild the SPA, commit, and push to origin.
// Usage: pnpm deploy -- "commit message"
import { execSync } from 'node:child_process';

const msg = process.argv.slice(2).join(' ').trim();
if (!msg) {
  console.error('Usage: pnpm deploy -- "commit message"');
  process.exit(1);
}

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
};

run('pnpm build');
run('git add -A');
run(`git commit -m ${JSON.stringify(msg)}`);
run('git push origin main');
console.log('\nDeployed ✓');
