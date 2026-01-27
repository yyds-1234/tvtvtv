import fastify from 'fastify';
import router from './router.js';
import { JsonDB, Config } from 'node-json-db';
import axios from 'axios';
import { getIPAddress } from "./util/network.js";
import path from 'path';
import os from 'os';

let server = null;

/**
 * Start the server with the given configuration.
 *
 * Be careful that start will be called multiple times when
 * work with catvodapp. If the server is already running,
 * the stop will be called by engine before start, make sure
 * to return new server every time.
 *
 * @param {Map} config - the config of the server
 * @return {void}
 */
export async function start(config) {
    /**
     * @type {import('fastify').FastifyInstance}
     */
    server = fastify({
        serverFactory: catServerFactory,
        forceCloseConnections: true,
        logger: !!(process.env.NODE_ENV !== 'development'),
        maxParamLength: 10240,
    });
    globalThis.messageToDart = server.messageToDart = async (data) => {
        try {
            console.log('messageToDart', data);
            const port = catDartServerPort();
            if (port == 0) {
                return null;
            }
            const resp = await axios.post(`http://127.0.0.1:${port}/msg`, data);
            return resp.data;
        } catch (error) {
            console.error(error);
            return null;
        }
    };
    server.address = function () {
        const result = this.server.address();
        result.url = `http://${getIPAddress()}:${result.port}`;
        result.dynamic = 'js2p://_WEB_';
        return result;
    };
    server.addHook('onError', async (_request, _reply, error) => {
        console.error(error);
        if (!error.statusCode) error.statusCode = 500;
        return error;
    });
    server.stop = false;
    server.config = config;
    // 数据库文件路径
    const writableRoot = path.join(os.homedir(), 'Documents');
    // 在开发模式下使用 globalThis.DB_NAME，在生产环境下使用构建时替换的 DB_NAME
    const dbName = typeof DB_NAME !== 'undefined' ? DB_NAME : globalThis.DB_NAME || 'shan';
    const dbFilePath = path.join(writableRoot, `${dbName}.db.json`);
    // 3. 初始化
    server.db = new JsonDB(new Config(dbFilePath, true, true, '/', true));
    //推荐使用NODE_PATH做db存储的更目录，这个目录在应用中清除缓存时会被清空
    //server.db = new JsonDB(new Config((process.env['NODE_PATH'] || '.') + `/${DB_NAME}.db.json`, true, true, '/', true));
    let oldPush = server.db.push.bind(server.db);
    server.db.push = async (...args) => {
        let rs = await oldPush(...args);
        // 异步存储配置
        server.db.getData("/")
            .then(allData => {
                server.messageToDart({
                    action: 'saveProfile',
                    opt: allData,
                });
            })
        return rs
    }
    let oldDelete = server.db.delete.bind(server.db);
    server.db.delete = async (...args) => {
        let rs = await oldDelete(...args);
        // 异步存储配置
        server.db.getData("/")
            .then(allData => {
                server.messageToDart({
                    action: 'saveProfile',
                    opt: allData,
                });
            })
        return rs
    }
    // 异步恢复配置
    server.messageToDart({
        action: 'queryProfile'
    })
        .then(allData => {
            if (allData && Object.keys(allData).length > 0) {
                oldPush('/', allData || {})
            }
        });
    server.register(router, { db: server.db, config });
    // 注册演员列表管理路由（直接挂载到 /website/ 路径）
    const actorFilterRouter = (await import('./website/cookie.js')).default;
    server.register(actorFilterRouter, { prefix: '/website', db: server.db });
    // pan 相关全局变量（wogg spider 依赖）
    globalThis.Pans = [
        { key: 'ali', name: '阿里', enable: true },
        { key: 'quark', name: '夸克', enable: true },
        { key: 'uc', name: 'UC', enable: true },
        { key: 'tianyi', name: '天翼', enable: true },
        { key: 'yidong', name: '移动', enable: true },
        { key: '123', name: '123云', enable: true },
        { key: '115', name: '115', enable: true },
        { key: 'baidu', name: '百度', enable: true },
    ];
    globalThis.getPanName = (key) => globalThis.Pans.find(pan => pan.key === key)?.name;
    globalThis.getPanEnabled = (key) => globalThis.Pans.find(pan => pan.key === key)?.enable;
    const startServer = (port) => {
        server.listen({ port: process.env['DEV_HTTP_PORT'] || port, host: '0.0.0.0' }, (err, address) => {
            if (err) {
                console.error(err);
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is already in use. Trying next available port...`);
                    startServer(port + 1);
                }
            } else {
                console.log(`Server listening on ${address}`);
            }
        });
    }
    startServer(9988);

    // 添加进程退出钩子，确保cookie在进程终止前保存
    const handleExit = async () => {
        try {
            const cookieStore = (await import('./util/cookieStore.js')).default;
            await cookieStore.save(true);
        } catch (err) {
            // 静默处理错误
        }
    };

    // 监听多种退出信号
    process.on('exit', handleExit);
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
    process.on('SIGHUP', handleExit);
}

/**
 * Stop the server if it exists.
 *
 */
export async function stop() {
    // 在关闭服务器前强制保存cookie，防止数据丢失
    try {
        const cookieStore = (await import('./util/cookieStore.js')).default;
        await cookieStore.save(true);  // immediate=true 立即保存
    } catch (err) {
        // 静默处理错误
    }

    if (server) {
        server.close();
        server.stop = true;
    }
    server = null;
}
