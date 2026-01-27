import { CookieJar } from 'tough-cookie';
import { JsonDB, Config } from 'node-json-db';
import fs from 'fs';
import path from 'path';

// 初始化 Cookie 数据库（DB_NAME 会在构建时被 esbuild 替换为实际值）
function getDbPath() {
    const dbName = typeof DB_NAME !== 'undefined' ? DB_NAME : globalThis.DB_NAME || 'shan';
    return (process.env['NODE_PATH'] || '.') + `/${dbName}.db.json`;
}

function initCookieDb() {
    return new JsonDB(new Config(getDbPath(), true, true, '/', true));
}

class CookieStore {
    constructor() {
        this.jar = new CookieJar();
        this.loaded = false;
        this.dirty = false;
        this.saveTimer = null;
        this.autoSaveEnabled = true;
        this.loadPromise = null;
        this.shutdownHooksAdded = false;

        // 添加进程退出监听，确保 cookie 被保存
        this.addShutdownHooks();
    }

    // 添加进程退出监听
    addShutdownHooks() {
        if (this.shutdownHooksAdded) return;
        this.shutdownHooksAdded = true;

        const shutdown = () => {
            if (this.dirty || this.saveTimer) {
                // 清除防抖定时器并立即保存
                if (this.saveTimer) {
                    clearTimeout(this.saveTimer);
                    this.saveTimer = null;
                }
                // 使用同步方式写入文件
                try {
                    const data = this.jar.toJSON();
                    const dbPath = getDbPath();
                    const dir = path.dirname(dbPath);

                    // 确保目录存在
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }

                    // 读取现有数据
                    let existingData = {};
                    if (fs.existsSync(dbPath)) {
                        try {
                            const content = fs.readFileSync(dbPath, 'utf-8');
                            existingData = JSON.parse(content);
                        } catch (err) {
                            existingData = {};
                        }
                    }

                    // 更新 cookies 字段
                    existingData.cookies = data;

                    // 同步写入文件
                    fs.writeFileSync(dbPath, JSON.stringify(existingData, null, 2), 'utf-8');
                } catch (err) {
                    // 忽略错误，进程即将退出
                }
            }
        };

        // 监听多种退出事件
        process.on('beforeExit', shutdown);
        process.on('SIGINT', () => {
            shutdown();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            shutdown();
            process.exit(0);
        });
        process.on('uncaughtException', (err) => {
            shutdown();
            throw err;
        });
    }

    // 从数据库加载 Cookie
    async load() {
        // 如果已经加载过，直接返回
        if (this.loaded) return;

        // 如果正在加载，等待加载完成
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // 开始加载
        this.loadPromise = (async () => {
            try {
                const db = initCookieDb();
                if (await db.exists('/cookies')) {
                    const data = await db.getData('/cookies');
                    // 使用 fromJSON 而不是旧的 deserialize
                    this.jar = data ? CookieJar.fromJSON(data) : new CookieJar();
                } else {
                    this.jar = new CookieJar();
                }
                this.loaded = true;
            } catch (err) {
                this.jar = new CookieJar();
                this.loaded = true;
            } finally {
                this.loadPromise = null;
            }
        })();

        return this.loadPromise;
    }

    // 保存 Cookie 到数据库
    async save(immediate = false) {
        if (!this.autoSaveEnabled) {
            this.dirty = true;
            return;
        }

        // 清除之前的定时器
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        const doSave = async () => {
            try {
                const db = initCookieDb();
                // 使用 toJSON() 而不是 serialize()，因为 serialize() 在 tough-cookie v4.1.4 中有 bug
                const data = this.jar.toJSON();
                await db.push('/cookies', data);
                this.dirty = false;
            } catch (err) {
                // 静默处理错误
            }
        };

        if (immediate) {
            await doSave();
        } else {
            // 防抖：1秒内多次调用只写入一次
            this.saveTimer = setTimeout(() => doSave(), 1000);
        }
    }

    // 设置是否自动保存
    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
        if (enabled && this.dirty) {
            this.save(true);
        }
    }

    // 获取 CookieJar 实例
    getJar() {
        return this.jar;
    }

    // 获取指定 URL 的 Cookie 字符串
    async getCookies(url) {
        return await this.jar.getCookieString(url);
    }

    // 设置 Cookie（从响应头）
    async setCookies(url, setCookieHeaders) {
        if (!setCookieHeaders || setCookieHeaders.length === 0) {
            return;
        }

        for (const cookieHeader of setCookieHeaders) {
            try {
                await this.jar.setCookie(cookieHeader, url);
            } catch (err) {
                // 静默处理错误
            }
        }
    }

    // 清空指定域的 Cookie
    clearCookies(domain) {
        const cookies = this.jar.toJSON().cookies || [];
        cookies.forEach((cookie) => {
            if (cookie.domain === domain || cookie.domain === `.${domain}`) {
                this.jar.removeCookie(cookie.key, cookie.path || '/', domain);
            }
        });
        this.save();
    }

    // 清空所有 Cookie
    clearAllCookies() {
        this.jar = new CookieJar();
        this.save();
    }
}

// 导出单例
const cookieStore = new CookieStore();
export default cookieStore;
