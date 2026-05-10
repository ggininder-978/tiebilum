import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { getSalesDiagnosis } from './build_knowledge_dashboard_data.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

async function generateVault(password) {
  if (!password) {
    password = process.env.TIEBILUM_VAULT_PWD || process.argv[2];
  }

  if (!password) {
    throw new Error('Encryption password required. Provide via TIEBILUM_VAULT_PWD env var or as CLI argument.');
  }

  console.log('--- Generating Encrypted Sales Vault ---');
  
  // 1. Get raw data
  const salesDiagnosis = await getSalesDiagnosis(ROOT);
  
  if (!salesDiagnosis) {
    console.error('Error: No sales diagnosis data found.');
    return;
  }

  const jsonStr = JSON.stringify(salesDiagnosis);
  
  // 2. Encryption Parameters
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const iterations = 100000;
  
  // 3. Derive Key (PBKDF2)
  const key = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  
  // 4. Encrypt (AES-GCM)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // 5. Output Vault
  const vault = {
    v: 1,
    algo: 'aes-256-gcm',
    kdf: 'pbkdf2',
    iterations,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: ciphertext.toString('base64')
  };

  const outputPath = join(ROOT, 'knowledge/sales-diagnosis-vault.json');
  await writeFile(outputPath, JSON.stringify(vault, null, 2), 'utf8');
  console.log(`Vault generated at: ${outputPath}`);
}

generateVault().catch(console.error);
