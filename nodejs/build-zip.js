import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const targetDir = 'D:\\icloud\\iCloudDrive\\JSTV';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getUniqueFileName(targetDir, baseName, ext) {
  let counter = 0;
  let fileName = `${baseName}${ext}`;
  let filePath = path.join(targetDir, fileName);

  while (fs.existsSync(filePath)) {
    counter++;
    fileName = `${baseName}_${counter}${ext}`;
    filePath = path.join(targetDir, fileName);
  }

  return fileName;
}

async function buildAndCopy() {
  try {
    console.log('开始压缩 dist 目录...');

    const zip = new AdmZip();
    const files = fs.readdirSync(distDir);

    files.forEach(file => {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        zip.addLocalFile(filePath);
        console.log(`添加文件: ${file}`);
      }
    });

    const zipBaseName = 'dist';
    const zipExt = '.zip';
    const zipPath = path.join(__dirname, `${zipBaseName}${zipExt}`);
    zip.writeZip(zipPath);
    console.log(`压缩完成: ${zipPath}`);

    console.log('开始拷贝到目标目录...');
    ensureDir(targetDir);

    const uniqueFileName = getUniqueFileName(targetDir, zipBaseName, zipExt);
    const targetZipPath = path.join(targetDir, uniqueFileName);
    fs.copyFileSync(zipPath, targetZipPath);
    console.log(`拷贝完成: ${targetZipPath}`);

    console.log('所有操作完成!');
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

buildAndCopy();
