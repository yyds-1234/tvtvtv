import req from '../../util/req.js';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://www.kbjfan.com';

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
    { type_id: 'koreanbjdance', type_name: 'Korean BJ Dance' },
    { type_id: 'koreanbjnude', type_name: 'Korean BJ Nude' },
  ];
  return {
    class: classes,
  };
}

async function category(inReq, _outResp) {
  const tid = inReq.body.id;
  const pg = inReq.body.page;
  let page = pg || 1;
  if (page == 0) page = 1;

  let url = `${SITE}/${tid}`;
  if (page > 1) {
    url += `/page/${page}`;
  }

  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('.posts-item').each((_, element) => {
    const href = $(element).find('.item-heading a').attr('href');
    const title = $(element).find('.item-heading a').text();
    const cover = $(element).find('.item-thumbnail img').attr('data-src');
    const pubdate = $(element).find('.meta-author span').text();
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_pubdate: pubdate,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 10 ? page : page + 1,
    list: videos,
    filter: [],
  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const html = await request(id);
  const $ = load(html);

  let vod_play_url = '';
  let playlist = $('.dplayer-featured a');

  if (playlist.length) {
    // 如果有多个播放列表，选择第一个
    vod_play_url = $('.dplayer-featured a').first().attr('video-url');
  } else {
    vod_play_url = $('#posts-pay .new-dplayer').attr('video-url');
  }

  const title = $('h1').text().trim() || $('title').text() || '';
  const pic = $('.item-thumbnail img').attr('data-src') || $('.item-thumbnail img').attr('src') || '';

  let vod = {
    vod_id: id,
    vod_name: title,
    vod_pic: pic,
    vod_play_from: 'Kbjfan',
    vod_play_url: '播放$' + vod_play_url,
  };

  return {
    list: [vod],
  };
}

async function play(inReq, _outResp) {
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
  let url = `${SITE}/?s=${text}`;
  if (page > 1) {
    url = `${SITE}/page/${page}/?s=${text}`;
  }

  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('.posts-item').each((_, element) => {
    const href = $(element).find('.item-heading a').attr('href');
    const title = $(element).find('.item-heading a').text();
    const cover = $(element).find('.item-thumbnail img').attr('data-src');
    const pubdate = $(element).find('.meta-author span').text();
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_pubdate: pubdate,
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
    key: 'kbjfan',
    name: 'Kbjfan',
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
