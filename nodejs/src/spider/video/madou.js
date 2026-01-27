import req from '../../util/req.js';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SITE = 'https://madou.club';

async function request(reqUrl) {
  const resp = await req.get(reqUrl, {
    headers: {
      'User-Agent': UA,
    },
  });
  return resp.data;
}

async function home(_inReq, _outResp) {
  const html = await request(SITE);
  const $ = load(html);
  let classes = [];
  let ignore = ['首页', '其他', '热门标签', '筛选'];
  $('.sitenav a').each((_, e) => {
    const name = $(e).text();
    const href = $(e).attr('href');
    if (ignore.includes(name)) return;
    classes.push({
      type_id: href,
      type_name: name,
    });
  });

  return {
    class: classes,
  };
}

async function category(inReq, _outResp) {
  const tid = inReq.body.id;
  const pg = inReq.body.page;
  // const extend = inReq.body.filters;
  let page = pg || 1;
  if (page == 0) page = 1;

  let reqUrl = tid;
  if (page > 1) {
    reqUrl = tid + '/page/' + page;
  }

  const html = await request(reqUrl);
  const $ = load(html);
  let videos = [];
  $('.excerpts-wrapper article').each((_, element) => {
    const vodUrl = $(element).find('a').attr('href');
    const vodName = $(element).find('h2').text();
    const vodPic = $(element).find('img').attr('data-src');
    const vodRemarks = $(element).find('.post-view').text().trim();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodRemarks,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 10 ? page : page + 1,
    list: videos,
    // filter logic placeholder
    filter: [],
  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const html = await request(id);
  const $ = load(html);
  let w = $('.article-content iframe').attr('src');
  let dash = w.match(/^(https?:\/\/[^\/]+)/)[1];
  let dashResp = await request(w);
  let $2 = load(dashResp);
  let html2 = $2('body script').eq(5).text();
  let token = html2.match(/var token = "(.+)";/)[1];
  let m3u8 = html2.match(/var m3u8 = '(.+)';/)[1];
  let playUrl = dash + m3u8 + '?token=' + token;

  let vod = {
    vod_id: id,
    vod_name: '',
    vod_pic: '',
    vod_play_from: '麻豆社',
    vod_play_url: '播放$' + playUrl,
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
    },
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;
  const text = encodeURIComponent(wd);
  const html = await request(`${SITE}/page/${page}?s=${text}`);
  const $ = load(html);
  let videos = [];
  $('.excerpts-wrapper article').each((_, element) => {
    const vodUrl = $(element).find('a').attr('href');
    const vodName = $(element).find('h2').text();
    const vodPic = $(element).find('img').attr('data-src');
    const vodRemarks = $(element).find('.post-view').text().trim();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodRemarks,
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
    key: 'madou',
    name: '麻豆社',
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
