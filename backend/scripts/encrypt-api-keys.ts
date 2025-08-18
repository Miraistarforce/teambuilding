#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { encrypt, decrypt, encryptApiKey, maskApiKey } from '../src/utils/encryption';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
};

async function main() {
  console.log('=== APIキー暗号化ツール ===\n');
  console.log('1. APIキーを暗号化');
  console.log('2. 暗号化されたAPIキーを復号化');
  console.log('3. .envファイルのAPIキーを暗号化');
  console.log('4. 終了\n');
  
  const choice = await question('選択してください (1-4): ');
  
  switch (choice) {
    case '1':
      await encryptApiKeyInteractive();
      break;
    case '2':
      await decryptApiKeyInteractive();
      break;
    case '3':
      await encryptEnvFile();
      break;
    case '4':
      console.log('終了します。');
      rl.close();
      return;
    default:
      console.log('無効な選択です。');
  }
  
  // 再度メニューを表示
  await main();
}

async function encryptApiKeyInteractive() {
  const apiKey = await question('\nAPIキーを入力してください: ');
  
  if (!apiKey) {
    console.log('APIキーが入力されていません。');
    return;
  }
  
  const encrypted = encryptApiKey(apiKey);
  console.log('\n=== 暗号化結果 ===');
  console.log('元のAPIキー（マスク表示）:', maskApiKey(apiKey));
  console.log('暗号化されたデータ:');
  console.log(encrypted);
  console.log('\n.envファイルに以下の形式で保存してください:');
  console.log(`YOUR_API_KEY='${encrypted}'`);
  console.log('');
}

async function decryptApiKeyInteractive() {
  const encryptedData = await question('\n暗号化されたデータを入力してください: ');
  
  if (!encryptedData) {
    console.log('データが入力されていません。');
    return;
  }
  
  try {
    const data = JSON.parse(encryptedData);
    const decrypted = decrypt(data.encrypted);
    console.log('\n=== 復号化結果 ===');
    console.log('復号化されたAPIキー（マスク表示）:', maskApiKey(decrypted));
    console.log('暗号化日時:', data.encryptedAt);
    console.log('');
  } catch (error) {
    console.error('復号化に失敗しました:', error);
  }
}

async function encryptEnvFile() {
  const envPath = path.join(__dirname, '../../.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('.envファイルが見つかりません。');
    return;
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  
  const apiKeyPatterns = [
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'AWS_ACCESS_KEY',
    'STRIPE_API_KEY'
  ];
  
  let modified = false;
  const newLines = lines.map(line => {
    // コメント行やセパレータはそのまま
    if (line.startsWith('#') || !line.includes('=')) {
      return line;
    }
    
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').replace(/^['"]|['"]$/g, '');
    
    // APIキーパターンに一致し、まだ暗号化されていない場合
    if (apiKeyPatterns.some(pattern => key.includes(pattern)) && 
        value && !value.startsWith('{')) {
      const encrypted = encryptApiKey(value);
      console.log(`暗号化: ${key} (${maskApiKey(value)})`);
      modified = true;
      return `${key}='${encrypted}'`;
    }
    
    return line;
  });
  
  if (modified) {
    // バックアップを作成
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, content);
    console.log(`\nバックアップを作成しました: ${backupPath}`);
    
    // 新しい内容を保存
    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('.envファイルを更新しました。');
  } else {
    console.log('暗号化が必要なAPIキーは見つかりませんでした。');
  }
  console.log('');
}

// メイン処理を開始
main().catch(error => {
  console.error('エラーが発生しました:', error);
  rl.close();
});