import _axios from 'axios';
import https from 'https';
import http from 'http';
import cookieStore from './cookieStore.js';

// 默认 headers，模拟真实浏览器
const defaultHeaders = {
    'Accept': 'application/json,text/plain,*/*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'close',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'X-Requested-With': 'XMLHttpRequest'
};

const req = _axios.create({
    httpsAgent: new https.Agent({
        keepAlive: false,
        rejectUnauthorized: false
    }),
    httpAgent: new http.Agent({ keepAlive: false }),
    headers: defaultHeaders
});

// 请求拦截器：自动添加 Cookie
req.interceptors.request.use(
    async (config) => {
        // 确保 Cookie 已加载
        await cookieStore.load();

        if (config.url) {
            const cookie = await cookieStore.getCookies(config.url);
            if (cookie && !config.headers.Cookie) {
                config.headers.Cookie = cookie;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 响应拦截器：自动保存 Set-Cookie
req.interceptors.response.use(
    async (response) => {
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders && setCookieHeaders.length > 0 && response.config.url) {
            await cookieStore.setCookies(response.config.url, setCookieHeaders);
            // 使用防抖保存（1秒内多次调用只写入一次），进程退出时会自动保存
            cookieStore.save();
        }
        return response;
    },
    (error) => Promise.reject(error)
);

// 扩展方法
req.saveCookies = (immediate = false) => cookieStore.save(immediate);
req.loadCookies = () => cookieStore.load();
req.clearCookies = (domain) => cookieStore.clearCookies(domain);
req.clearAllCookies = () => cookieStore.clearAllCookies();
req.getCookieJar = () => cookieStore.getJar();
req.setAutoSave = (enabled) => cookieStore.setAutoSave(enabled);

export default req;
