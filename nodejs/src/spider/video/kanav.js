import req from '../../util/req.js';
import { load } from 'cheerio';
import CryptoJS from 'crypto-js';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';
const SITE = 'https://kanav.ad';

async function request(reqUrl) {
  const resp = await req.get(reqUrl, {
    headers: {
      'User-Agent': UA,
    },
  });
  return resp.data;
}

async function home(_inReq, _outResp) {
  let classes = [
    { type_id: '1', type_name: '中文字幕' },
    { type_id: '2', type_name: '日韩' },
    { type_id: '3', type_name: '欧美' },
    { type_id: '4', type_name: '国产' },
    { type_id: '30', type_name: '自拍' },
    { type_id: '31', type_name: '探花' },
    { type_id: '32', type_name: '主播' },
    { type_id: '20', type_name: '动漫' },
  ];
  return {
    class: classes,
  };
}

async function category(inReq, _outResp) {
  const tid = inReq.body.id;
  const pg = inReq.body.page;
  const extend = inReq.body.filters || 'time_add';
  let page = pg || 1;
  if (page == 0) page = 1;
  let reqUrl = `${SITE}/index.php/vod/show/by/${extend.sort}/id/${tid}/page/${page}.html`;
  const html = await request(reqUrl);
  const $ = load(html);
  let videos = [];
  $('.post-list .col-md-3').each((_, element) => {
    const videoItem = $(element).find('.video-item');
    const entryTitle = $(element).find('.entry-title');
    const vodUrl = entryTitle.find('a').attr('href');
    const vodPic = videoItem.find('.featured-content-image a img').attr('data-original');
    const vodName = entryTitle.find('a').text().trim();
    const remark = videoItem.find('span.model-view-left').text().trim();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: remark,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 10 ? page : page + 1,
    list: videos,
    filter: [{
      key: "sort",
      name: "排序",
      init: "time_add", //默认值
      value: [
        { "n": "最新发布", "v": "time_add" },
        { "n": "最多观看", "v": "hits" },
        { "n": "本周热榜", "v": "hits_week" },
      ],
    }],

  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const html = await request(SITE + id);
  const $ = load(html);
  const player = $('script:contains(player_aaaa)').text().replace('var player_aaaa=', '');
  const encodedUrl = JSON.parse(player).url;
  const base64Decoded = CryptoJS.enc.Base64.parse(encodedUrl).toString(CryptoJS.enc.Utf8);
  const decodedUrl = decodeURIComponent(base64Decoded);
  const name = $('.hr-style.hr-actor').siblings('a').text();
  const c = { id: 's-' + name, name: name };
  const actor = [`[a = cr: ${JSON.stringify(c)} /]${name}[/a]`];

  let vod = {
    vod_id: id,
    vod_name: $('.page-title').text().trim(),
    vod_pic: $('.video-cover img').attr('data-original'),
    vod_actor: actor,
    vod_play_from: 'KanAV',
    vod_play_url: '播放$' + decodedUrl,
  };

  return {
    list: [vod],
  };
}

async function play(inReq, _outResp) {
  const flag = inReq.body.flag;
  const id = inReq.body.id;
  return {
    parse: 0,
    url: id,
    header: {
      'User-Agent': UA,
      'Referer': 'https://kanav.ad/',
    },
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;
  const text = encodeURIComponent(wd);
  const html = await request(`${SITE}/index.php/vod/search/by/time_add/page/${page}/wd/${text}.html`);
  const $ = load(html);
  let videos = [];
  $('.post-list .col-md-3').each((_, element) => {
    const videoItem = $(element).find('.video-item');
    const entryTitle = $(element).find('.entry-title');
    const vodUrl = entryTitle.find('a').attr('href');
    const vodPic = videoItem.find('.featured-content-image a img').attr('data-original');
    const vodName = entryTitle.find('a').text().trim();
    const remark = videoItem.find('span.model-view-left').text().trim();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: remark,
    });
  });
  return {
    page: page,
    pagecount: videos.length < 10 ? page : page + 1,
    list: videos,
  };
}

export default {
  meta: {
    key: 'kanav',
    name: 'KanAV',
    type: 3,
  },
  api: async (fastify) => {
    fastify.post('/init', async () => ({}));
    fastify.post('/home', home);
    fastify.post('/category', category);
    fastify.post('/detail', detail);
    fastify.post('/play', play);
    fastify.post('/search', search);
  },
};
//https://kanav.ad/index.php/vod/search.html?wd=%E5%8C%97%E9%87%8E%E6%9C%AA%E5%A5%88&by=time_add