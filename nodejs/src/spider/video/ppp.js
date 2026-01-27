import req from '../../util/req.js';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://ppp.porn';

async function request(reqUrl) {
  const resp = await req.get(reqUrl, {
    headers: {
      'User-Agent': UA,
      'Referer': 'https://ppp.porn/pp1/',
    },
  });
  return resp.data;
}

async function home(_inReq, _outResp) {
  const classUrl = `${SITE}/categories/`;
  const html = await request(classUrl);
  const $ = load(html);
  let classes = [];

  $('section.padding-bottom-xl .card-cat-v2').each((_, e) => {
    const title = $(e).find('.card-cat-v2__title').text().trim();
    const count = $(e).find('.card-cat-v2__count').text().trim();
    const name = `${title}(${count})`;
    const href = $(e).find('a').attr('href');
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
  let page = pg || 1;
  if (page == 0) page = 1;

  const url = `${tid}?mode=async&function=get_block&block_id=list_videos_common_videos_list&sort_by=post_date&from=${page}`;
  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('#list_videos_common_videos_list_items .item').each((_, element) => {
    const title = $(element).find('h4 a').text().trim();
    const cover = $(element).find('img').attr('data-src');
    const href = $(element).find('h4 a').attr('href');
    const duration = $(element).find('.card-video__duration').text();
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_duration: duration,
      vod_remarks: '',
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
  const html = await request(id);
  const $ = load(html);

  let m3u8Url = null;
  $('script').each((i, script) => {
    const content = $(script).html();
    if (content && content.includes('.m3u8')) {
      const match = content.match(/https?:\/\/[\w./-]+\.m3u8/);
      if (match) {
        m3u8Url = match[0];
      }
    }
  });

  const title = $('h1').text().trim() || $('meta[property="og:title"]').attr('content') || '';
  const pic = $('meta[property="og:image"]').attr('content') || $('img.video-thumb').attr('src') || '';

  let vod = {
    vod_id: id,
    vod_name: title,
    vod_pic: pic,
    vod_play_from: 'PPP',
    vod_play_url: '播放$' + m3u8Url,
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
      'Referer': 'https://ppp.porn/pp1/',
    },
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;

  const text = encodeURIComponent(wd);
  const url = `${SITE}/search/${text}/?mode=async&function=get_block&block_id=list_videos_videos_list_search_result&q=${text}&category_ids=&sort_by=&from_videos=${page}&from_albums=${page}`;
  const html = await request(url);
  const $ = load(html);
  let videos = [];

  $('#list_videos_videos_list_search_result_items .item').each((_, element) => {
    const title = $(element).find('h4 a').text().trim();
    const cover = $(element).find('img').attr('data-src');
    const href = $(element).find('h4 a').attr('href');
    const duration = $(element).find('.card-video__duration').text();
    videos.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_duration: duration,
      vod_remarks: '',
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
    key: 'ppp',
    name: 'PPPHub',
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
