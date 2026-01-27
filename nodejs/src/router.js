//新增站源需修改
import kanav from "./spider/video/kanav.js";
import taiav from "./spider/video/taiav.js";
import rou from "./spider/video/rou.js";
import madou from "./spider/video/madou.js";
import avdb from "./spider/video/avdb.js";
import pornhub from "./spider/video/pornhub.js";
import kbjfan from "./spider/video/kbjfan.js";
import ppp from "./spider/video/ppp.js";
import missav from "./spider/video/missav.js";
import jable from "./spider/video/jable.js";
import qrcode from "./spider/video/qrcode.js";
import axios from "axios";

const getSpiders = async (server) => {
    //新增站源需修改
    const spiders = [kanav, taiav, rou, madou, avdb, pornhub, kbjfan, ppp, missav, jable, qrcode];
    return spiders
}
const spiderPrefix = '/spider';

/**
 * A function to initialize the router.
 *
 * @param {Object} fastify - The Fastify instance
 * @return {Promise<void>} - A Promise that resolves when the router is initialized
 */
export default async function router(fastify, { db, config: serverConfig }) {
    // register all spider router
    const spiders = await getSpiders({ db, config: serverConfig });
    spiders.forEach((spider) => {
        const path = spiderPrefix + '/' + spider.meta.key + '/' + spider.meta.type;
        fastify.register(spider.api, { prefix: path, db });
        spider.check?.(fastify)
        console.log('Register spider: ' + path);
    });
    /**
     * @api {get} /check 检查
     */
    fastify.register(
        /**
         *
         * @param {import('fastify').FastifyInstance} fastify
         */
        async (fastify) => {
            fastify.get(
                '/check',
                /**
                 * check api alive or not
                 * @param {import('fastify').FastifyRequest} _request
                 * @param {import('fastify').FastifyReply} reply
                 */
                async function (_request, reply) {
                    reply.send({ run: !fastify.stop });
                }
            );
            const getConfig = async () => {
                const config = {
                    video: {
                        sites: [],
                    },
                    read: {
                        sites: [],
                    },
                    comic: {
                        sites: [],
                    },
                    music: {
                        sites: [],
                    },
                    pan: {
                        sites: [],
                    },
                    color: fastify.config.color || [],
                };
                const spiders = await getSpiders({ db, config: serverConfig });
                spiders.forEach((spider) => {
                    let meta = Object.assign({}, spider.meta);
                    meta.api = spiderPrefix + '/' + meta.key + '/' + meta.type;
                    meta.key = 'nodejs_' + meta.key;
                    const stype = spider.meta.type;
                    if (stype < 10) {
                        config.video.sites.push(meta);
                    } else if (stype >= 10 && stype < 20) {
                        config.read.sites.push(meta);
                    } else if (stype >= 20 && stype < 30) {
                        config.comic.sites.push(meta);
                    } else if (stype >= 30 && stype < 40) {
                        config.music.sites.push(meta);
                    } else if (stype >= 40 && stype < 50) {
                        config.pan.sites.push(meta);
                    }
                });
                return config
            }
            fastify.get(
                '/config',
                /**
                 * get catopen format config
                 * @param {import('fastify').FastifyRequest} _request
                 * @param {import('fastify').FastifyReply} reply
                 */
                async function (_request, reply) {
                    reply.send(await getConfig());
                }
            );
            fastify.get('/full-config', getConfig)
        }
    );
}
