import { createServer } from 'http';

console.time('启动耗时')
globalThis.catServerFactory = (handle) => {
    let port = 0;
    const server = createServer((req, res) => {
        handle(req, res);
    });
    server.on('listening', () => {
        console.timeEnd('启动耗时')
        port = server.address().port;
        console.log('Run on ' + port);
    });
    server.on('close', () => {
        console.log('Close on ' + port);
    });
    return server;
};

globalThis.catDartServerPort = () => {
    return 0;
};

// 在开发模式下设置 DB_NAME（用于 cookieStore.js）
globalThis.DB_NAME = process.env.DB || 'shan';

import { start } from './index.js';

import * as config from './index.config.js';

start(config.default);
