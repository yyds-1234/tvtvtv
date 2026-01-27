/**
 * 爬虫配置管理模块
 * 提供 Web 界面用于管理爬虫的域名配置和演员筛选列表
 */

// Web 管理页面
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>爬虫配置管理面板</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #666;
            line-height: 1.6;
        }
        .info strong {
            color: #333;
        }
        .form-section {
            margin-bottom: 30px;
            padding-bottom: 25px;
            border-bottom: 1px solid #e0e0e0;
        }
        .form-section:last-child {
            border-bottom: none;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 18px;
            color: #667eea;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .site-name {
            font-size: 16px;
            color: #667eea;
            margin-bottom: 8px;
            font-weight: 600;
        }
        label {
            display: block;
            margin-bottom: 6px;
            color: #555;
            font-size: 13px;
        }
        input[type="text"], textarea {
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
        }
        input[type="text"]:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        textarea {
            resize: vertical;
            min-height: 100px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
        .input-hint {
            font-size: 12px;
            color: #888;
            margin-top: 5px;
        }
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
        }
        .btn-save {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-clear {
            background: #f5f5f5;
            color: #666;
        }
        .message {
            padding: 12px;
            border-radius: 6px;
            margin-top: 15px;
            display: none;
            font-size: 13px;
            text-align: center;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚙️ 爬虫配置管理面板</h1>

        <!-- 域名配置部分 -->
        <div class="form-section">
            <div class="section-title">🌐 域名配置</div>

            <div class="info">
                <strong>使用说明：</strong><br>
                配置自定义域名，爬虫将使用您配置的域名进行访问。留空则使用默认域名。
            </div>

            <form id="siteForm">
                <div class="form-group">
                    <div class="site-name">MissAV</div>
                    <label>自定义域名：</label>
                    <input type="text" id="missavSite" placeholder="missav.example.com">
                    <div class="input-hint">例如：missav.live 或 missav.example.com（无需添加 https://）</div>
                </div>

                <div class="btn-group">
                    <button type="submit" class="btn-save">保存域名配置</button>
                    <button type="button" class="btn-clear" onclick="clearSiteForm()">重置为默认</button>
                </div>
            </form>
        </div>

        <!-- 演员列表配置部分 -->
        <div class="form-section">
            <div class="section-title">🎬 演员列表配置</div>

            <div class="info">
                <strong>使用说明：</strong><br>
                1. 输入您喜欢的演员名字，多个演员用英文逗号分隔<br>
                2. 例如：三上悠子,深田咏美,波多野结衣<br>
                3. 保存后，爬虫将显示这些演员的筛选选项
            </div>

            <form id="actorForm">
                <div class="form-group">
                    <div class="site-name">MissAV</div>
                    <label>演员列表（逗号分隔）：</label>
                    <textarea id="missavActors" placeholder="三上悠子,深田咏美,波多野结衣"></textarea>
                </div>

                <div class="btn-group">
                    <button type="submit" class="btn-save">保存演员列表</button>
                    <button type="button" class="btn-clear" onclick="clearActorForm()">清空</button>
                </div>
            </form>
        </div>

        <div class="message" id="message"></div>
    </div>

    <script>
        // 页面加载时获取已保存的配置
        window.addEventListener('DOMContentLoaded', async () => {
            try {
                const res = await fetch(location.pathname, { method: 'GET' });
                const data = await res.json();
                if (data.code === 0) {
                    // 加载域名配置
                    if (data.data.sites && data.data.sites.missav) {
                        document.getElementById('missavSite').value = data.data.sites.missav;
                    }
                    // 加载演员列表
                    if (data.data.actors && data.data.actors.missav) {
                        document.getElementById('missavActors').value = data.data.actors.missav;
                    }
                }
            } catch (error) {
                console.error('获取配置失败:', error);
            }
        });

        // 保存域名配置
        document.getElementById('siteForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const missavSite = document.getElementById('missavSite').value.trim();

            const data = { missav: missavSite || null };

            try {
                const res = await fetch(location.pathname + '/site', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();

                if (result.code === 0) {
                    showMessage('域名配置保存成功！', 'success');
                } else {
                    showMessage(result.message || '保存失败', 'error');
                }
            } catch (error) {
                showMessage('网络错误: ' + error.message, 'error');
            }
        });

        // 保存演员列表
        document.getElementById('actorForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const missavActors = document.getElementById('missavActors').value.trim();

            const data = { missav: missavActors };

            try {
                const res = await fetch(location.pathname + '/actor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();

                if (result.code === 0) {
                    showMessage('演员列表保存成功！', 'success');
                } else {
                    showMessage(result.message || '保存失败', 'error');
                }
            } catch (error) {
                showMessage('网络错误: ' + error.message, 'error');
            }
        });

        function showMessage(text, type) {
            const msgEl = document.getElementById('message');
            msgEl.textContent = text;
            msgEl.className = 'message ' + type;
            msgEl.style.display = 'block';

            setTimeout(() => {
                msgEl.style.display = 'none';
            }, 3000);
        }

        function clearSiteForm() {
            document.getElementById('missavSite').value = '';
        }

        function clearActorForm() {
            document.getElementById('missavActors').value = '';
        }
    </script>
</body>
</html>`;

// 数据库路径
const ACTOR_DB_PATH = '/actorFilters';
const SITE_DB_PATH = '/missavSite';

/**
 * 保存演员列表到数据库
 */
async function saveActorList(db, site, actors) {
    const currentData = await db.getData(ACTOR_DB_PATH).catch(() => ({}));
    currentData[site] = actors;
    await db.push(ACTOR_DB_PATH, currentData);
}

/**
 * 获取演员列表从数据库
 */
async function getActorList(db, site) {
    try {
        const data = await db.getData(ACTOR_DB_PATH);
        return data[site] || '';
    } catch {
        return '';
    }
}

/**
 * 保存站点域名到数据库
 */
async function saveSite(db, site, domain) {
    const currentData = await db.getData(SITE_DB_PATH).catch(() => ({}));
    if (domain) {
        currentData[site] = domain;
    } else {
        delete currentData[site];
    }
    await db.push(SITE_DB_PATH, currentData);
}

/**
 * 获取站点域名从数据库
 */
async function getSite(db, site) {
    try {
        const data = await db.getData(SITE_DB_PATH);
        return data[site] || '';
    } catch {
        return '';
    }
}

/**
 * 爬虫配置管理路由
 */
export default async function spiderConfig(fastify, options) {
    const db = options.db;

    // GET 请求返回 Web 页面及当前数据
    fastify.get('/', async (req, res) => {
        const acceptHeader = req.headers['accept'] || '';

        // 如果请求 HTML 页面
        if (acceptHeader.includes('text/html')) {
            res.type('text/html').send(HTML_PAGE);
        } else {
            // 否则返回 JSON 数据
            const data = {
                actors: {
                    missav: await getActorList(db, 'missav'),
                },
                sites: {
                    missav: await getSite(db, 'missav'),
                },
            };
            res.send({ code: 0, data });
        }
    });

    // POST /site 处理域名配置保存
    fastify.post('/site', async (req, res) => {
        const { missav } = req.body;

        try {
            if (missav !== undefined) {
                await saveSite(db, 'missav', missav);
            }

            res.send({ code: 0, message: '域名配置保存成功' });
        } catch (error) {
            res.status(500).send({ code: -1, message: '保存失败: ' + error.message });
        }
    });

    // POST /actor 处理演员列表保存
    fastify.post('/actor', async (req, res) => {
        const { missav } = req.body;

        try {
            if (missav !== undefined) {
                await saveActorList(db, 'missav', missav);
            }

            res.send({ code: 0, message: '演员列表保存成功' });
        } catch (error) {
            res.status(500).send({ code: -1, message: '保存失败: ' + error.message });
        }
    });

    // 提供给爬虫使用的辅助函数
    fastify.getActors = async (site) => {
        const actorsStr = await getActorList(db, site);
        if (!actorsStr) return [];
        return actorsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
    };

    fastify.getSite = async (site) => {
        return await getSite(db, site);
    };
}
