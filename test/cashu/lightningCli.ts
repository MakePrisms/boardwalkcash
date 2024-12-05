import { spawn } from 'node:child_process';

export interface LightningCliOptions {
  nodeNumber: number;
  baseDir?: string;
}

export async function lightningCli<T>(
  command: string[],
  options: LightningCliOptions,
): Promise<T> {
  const baseDir = process.env.LIGHTNING_BASE_DIR || options.baseDir;

  const lightningDir = `${baseDir}/l${options.nodeNumber}`;

  return new Promise((resolve, reject) => {
    const cli = spawn('lightning-cli', [
      `--lightning-dir=${lightningDir}`,
      ...command,
    ]);

    let stdout = '';
    let stderr = '';

    cli.stdout.on('data', (data) => {
      stdout += data;
    });

    cli.stderr.on('data', (data) => {
      stderr += data;
    });

    cli.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`lightning-cli failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse lightning-cli output: ${err}`));
      }
    });
  });
}

export async function createInvoice(
  amount: number,
  options: LightningCliOptions,
): Promise<string> {
  const label = `test${Math.random()}`;
  const description = `desc${Math.random()}`;
  const invoiceRes = await lightningCli<{ bolt11: string }>(
    ['invoice', amount.toString(), label, description],
    options,
  );
  return invoiceRes.bolt11;
}

export async function payInvoice(
  invoice: string,
  options: LightningCliOptions,
): Promise<void> {
  await lightningCli(['pay', invoice], options);
}

// Example usage:
// await lightningCli(["getinfo"], { nodeNumber: 1 });
// await lightningCli(["pay", "bolt11"], { nodeNumber: 2 });
