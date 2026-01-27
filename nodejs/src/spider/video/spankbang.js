import req from '../../util/req.js';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)';
const SITE = 'https://jp.spankbang.com';

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
    { type_id: 'new_videos', type_name: '最新' },
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

  const url = `${SITE}/${tid}/${page}`;
  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('.video-item').each((_, e) => {
    const href = $(e).find('a.thumb').attr('href');
    const title = $(e).find('img.cover').attr('alt');
    const cover = $(e).find('img.cover').attr('data-src');
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 20 ? page : page + 1,
    list: videos,
    filter: [],
  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const url = SITE + id;
  const html = await request(url);

  // 从script标签中提取stream_data信息
  const streamDataMatch = html.match(/var stream_data\s*=\s*({[^;]+});/);
  let vod_play_url = '';

  if (streamDataMatch && streamDataMatch[1]) {
    try {
      // 将单引号转换为双引号以便JSON解析
      const jsonString = streamDataMatch[1].replace(/'/g, '"');
      const streamData = JSON.parse(jsonString);

      // 优先使用main流
      if (streamData.main && streamData.main.length > 0) {
        vod_play_url = streamData.main[0];
      } else if (streamData['240p'] && streamData['240p'].length > 0) {
        vod_play_url = streamData['240p'][0];
      } else if (streamData.m3u8 && streamData.m3u8.length > 0) {
        vod_play_url = streamData.m3u8[0];
      }
    } catch (error) {
      // 处理解析错误
    }
  }

  const $ = load(html);
  const title = $('h1').text().trim() || $('meta[property="og:title"]').attr('content') || '';
  const pic = $('meta[property="og:image"]').attr('content') || '';

  let vod = {
    vod_id: id,
    vod_name: title,
    vod_pic: pic,
    vod_play_from: 'SpankBang',
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
  const url = `${SITE}/s/${text}/${page}/`;
  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('.js-video-item').each((_, e) => {
    const href = $(e).find('a[href*="/video/"]').attr('href');
    const title = $(e).find('img').attr('alt');
    const cover = $(e).find('img').attr('data-src') || $(e).find('img').attr('src');
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 20 ? page : page + 1,
    list: videos,
  };
}

export default {
  meta: {
    key: 'spankbang',
    name: 'SpankBang',
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
