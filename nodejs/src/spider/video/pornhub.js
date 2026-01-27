import req from '../../util/req.js';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SITE = 'https://cn.pornhub.com';

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
    { type_id: 'sy', type_name: 'Home' },
    { type_id: 'cm', type_name: 'Newest' },
    { type_id: 'mv', type_name: 'Most Viewed' },
    { type_id: 'ht', type_name: 'Hottest' },
    { type_id: 'tr', type_name: 'Top Rated' },
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

  let url = `${SITE}/video?`;
  if (tid !== 'sy') {
    url = `${SITE}/video?o=${tid}`;
  }
  if (page > 1) {
    url += (tid === 'sy' ? `page=${page}` : `&page=${page}`);
  }

  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('li.videoBox').each((_, element) => {
    const href = $(element).find('.phimage a.img').attr('href');
    const title = $(element).find('.title a').attr('title');
    const cover = $(element).find('.phimage a.img img').attr('src') || $(element).find('.phimage a.img img').attr('data-mediumthumb') || '';
    const subTitle = $(element).find('.views').text().trim() || '';
    const duration = $(element).find('.duration').text().trim() || '';
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_remarks: subTitle,
      vod_duration: duration,
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

  const jsonStrMatch = html.match(/var flashvars_.* = \{(.*?)\};/);
  let vod_play_url = '';
  if (jsonStrMatch && jsonStrMatch[1]) {
    try {
      const json = JSON.parse('{' + jsonStrMatch[1] + '}');
      const videos = json.mediaDefinitions.filter((e) => e.format === 'hls');
      if (videos.length > 0) {
        // 选择最高质量
        vod_play_url = videos[videos.length - 1].videoUrl;
      }
    } catch (e) {
      // 处理解析错误
    }
  }

  const $ = load(html);
  const title = $('h1.title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
  const pic = $('meta[property="og:image"]').attr('content') || '';

  let vod = {
    vod_id: id,
    vod_name: title,
    vod_pic: pic,
    vod_play_from: 'Pornhub',
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
  const url = `${SITE}/video/search?search=${text}&page=${page}`;
  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('li.videoBox').each((_, element) => {
    const href = $(element).find('.phimage a.img').attr('href');
    const title = $(element).find('.title a').attr('title');
    const cover = $(element).find('.phimage a.img img').attr('src') || $(element).find('.phimage a.img img').attr('data-mediumthumb') || '';
    const subTitle = $(element).find('.views').text().trim() || '';
    const duration = $(element).find('.duration').text().trim() || '';
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_remarks: subTitle,
      vod_duration: duration,
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
    key: 'pornhub',
    name: 'Pornhub',
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
