import { getIPAddress } from '../../util/network.js';

// 获取 website 页面的 URL
function getWebsiteUrl(port = 9988) {
    const ip = getIPAddress();
    return `http://${ip}:${port}/website/`;
}

const websiteUrl = getWebsiteUrl();
// 生成二维码图片 URL
function getQrCodeUrl(url) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
}

async function home(_inReq, _outResp) {
    let classes = [
        { type_id: 'qrcode', type_name: websiteUrl },
    ];
    return {
        class: classes,
    };
}

async function category(inReq, _outResp) {
    const pg = inReq.body.page;
    let page = pg || 1;
    if (page == 0) page = 1;

    const qrCodeUrl = getQrCodeUrl(websiteUrl);

    // 返回包含二维码的列表
    let videos = [
        {
            vod_id: 'open_webview',
            vod_name: '📱 扫码打开配置页面',
            vod_pic: qrCodeUrl,
            vod_remarks: '扫码或点击详情打开',
        },
    ];

    return {
        page: page,
        pagecount: 1,
        list: videos,
    };
}

async function detail(inReq, _outResp) {
    const req = inReq.body.id;


    await req.server.messageToDart({
        action: 'openInternalWebview',
        opt: {
            url: websiteUrl,
        },
    });
    return {
        list: [{
            vod_name: '',
            vod_content: ''
        }]
    }
}

async function play(_inReq, _outResp) {
    return {
        parse: 0,
        url: '',
    };
}

async function search(_inReq, _outResp) {
    return {
        page: 1,
        pagecount: 1,
        list: [],
    };
}

async function init(_inReq, _outResp) {
    return {};
}

export default {
    meta: {
        key: 'qrcode',
        name: '配置页面',
        type: 3,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
    },
};
