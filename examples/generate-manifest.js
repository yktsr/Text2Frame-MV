#!/usr/bin/env node
/**
 * RPGツクール MV/MZ の JSON データから manifest を自動生成するスクリプト
 * 
 * 使用例:
 *   node examples/generate-manifest.js --data-dir data --output examples/auto-manifest.json --locale ja --source-locale ja
 */

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');

const program = new Command();

program
  .version('1.0.0')
  .description('RPGツクール JSON から batch-manifest を自動生成')
  .option('--data-dir <dir>', 'ゲームデータディレクトリ', 'data')
  .option('--output <file>', '出力ファイルパス', 'examples/auto-manifest.json')
  .option('--locale <locale>', 'locale（e.g. ja, en）', 'ja')
  .option('--source-locale <locale>', 'sourceLocale（e.g. ja）', 'ja')
  .option('--text-base <dir>', 'テキストファイルの基準ディレクトリ', 'text')
  .parse();

const options = program.opts();

const dataDir = path.resolve(options.dataDir);
const outputFile = path.resolve(options.output);
const textBaseDir = options.textBase;
const locale = options.locale;
const sourceLocale = options.sourceLocale;

if (!fs.existsSync(dataDir)) {
  console.error(`Error: Data directory not found: ${dataDir}`);
  process.exit(1);
}

/**
 * Map*.json ファイルをスキャンしてイベントエントリを生成
 */
function scanMapEvents() {
  const entries = [];
  
  // Map*.json ファイルを見つける
  const files = fs.readdirSync(dataDir);
  const mapFiles = files.filter(f => /^Map\d+\.json$/.test(f)).sort();
  
  mapFiles.forEach(file => {
    const mapPath = path.join(dataDir, file);
    const match = file.match(/^Map(\d+)\.json$/);
    if (!match) return;
    
    const mapId = String(parseInt(match[1], 10)); // ゼロパディングを削除
    const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    
    if (!mapData.events || !Array.isArray(mapData.events)) return;
    
    mapData.events.forEach((event, eventIndex) => {
      if (!event || !event.pages || !Array.isArray(event.pages)) return;
      
      const eventId = String(eventIndex); // events[1] が eventId 1
      
      event.pages.forEach((page, pageIndex) => {
        const pageId = String(pageIndex + 1); // page index を 1-based に
        const key = `map${String(mapId).padStart(3, '0')}_event${String(eventId).padStart(3, '0')}_page${pageId}`;
        const textPath = `${textBaseDir}/${locale}/${key}.txt`;
        
        entries.push({
          kind: 'event',
          mapId: String(mapId), // ID は文字列として保持
          eventId: String(eventId),
          pageId: String(pageId),
          locale: locale,
          sourceLocale: sourceLocale,
          key: key,
          textPath: textPath
        });
      });
    });
  });
  
  return entries;
}

/**
 * CommonEvents.json をスキャンしてコモンイベントエントリを生成
 */
function scanCommonEvents() {
  const entries = [];
  
  const commonPath = path.join(dataDir, 'CommonEvents.json');
  if (!fs.existsSync(commonPath)) {
    return entries;
  }
  
  const commonData = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
  
  if (!Array.isArray(commonData)) return entries;
  
  commonData.forEach((commonEvent, index) => {
    if (!commonEvent) return; // commonData[0] は null
    
    const commonEventId = String(index);
    const key = `common${String(index).padStart(3, '0')}`;
    const textPath = `${textBaseDir}/${locale}/${key}.txt`;
    
    entries.push({
      kind: 'common',
      commonEventId: String(index),
      locale: locale,
      sourceLocale: sourceLocale,
      key: key,
      textPath: textPath
    });
  });
  
  return entries;
}

/**
 * manifest を生成して出力
 */
function generateManifest() {
  const mapEntries = scanMapEvents();
  const commonEntries = scanCommonEvents();
  const allEntries = [...mapEntries, ...commonEntries];
  
  const manifest = {
    version: 1,
    entries: allEntries
  };
  
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2), 'utf8');
  
  console.log(`Manifest generated: ${outputFile}`);
  console.log(`Total entries: ${allEntries.length}`);
  console.log(`  - Events: ${mapEntries.length}`);
  console.log(`  - Common Events: ${commonEntries.length}`);
}

try {
  generateManifest();
} catch (error) {
  console.error('Error generating manifest:', error.message);
  process.exit(1);
}
