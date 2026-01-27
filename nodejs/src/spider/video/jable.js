import req from '../../util/req.js';
import { load } from 'cheerio';

// 使用完整的 iPhone Safari User-Agent
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)';
const SITE = 'https://jable.tv';

async function request(reqUrl, referer = '') {
  const resp = await req.get(reqUrl, {
    headers: {
      'User-Agent': UA,
      'Referer': referer || SITE,
      'Origin': SITE,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
  });
  return resp.data;
}

async function home(inReq, _outResp) {
  let classes = [];
  let ignore = ['首页'];
  classes.push({
    type_id: SITE + '/hot/',
    type_name: '热度排行',
  });

  const classUrl = `${SITE}/categories/?mode=async&function=get_block&block_id=list_categories_video_categories_list&sort_by=avg_videos_popularity`;
  const html = await request(classUrl, SITE);
  const $ = load(html);

  $('.container .col-6.col-sm-4.col-lg-3').each((_, e) => {
    const name = $(e).find('h4').text();
    const href = $(e).find('a').attr('href');
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
  const extend = inReq.body.filters || {};
  let sort = '';
  if (tid === SITE + '/hot/') {
    sort = extend.sort || 'video_viewed_month';
  } else {
    sort = extend.sort || 'post_date';
  }
  let page = pg || 1;
  if (page == 0) page = 1;
  let reqUrl = `${tid}?mode=async&function=get_block&block_id=list_videos_common_videos_list&sort_by=${sort}&from=${page}&_=${Date.now()}`;
  const html = await request(reqUrl, tid);
  const $ = load(html);
  let videos = [];
  $('#list_videos_common_videos_list .container .row > div').each((_, element) => {
    const vodUrl = $(element).find('.title a').attr('href');
    const vodName = $(element).find('.title a').text();
    const vodPic = $(element).find('.img-box img').attr('data-src');
    const vodDuration = $(element).find('.label').text();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodDuration,
    });
  });
  let sortfilter = [];
  // 近期最佳 post_date_and_popularity
  // 最近更新 post_date
  // 最多观看 video_viewed
  // 最高收藏 most_favourited

  // 所有时间 video_viewed
  // 本月热门 video_viewed_month
  // 本周热门 video_viewed_week
  // 今日热门 video_viewed_today
  if (tid === SITE + '/hot/') {
    sortfilter = [{
      key: 'sort', name: '排序', init: 'video_viewed_month', value: [
        { n: '所有时间', v: 'video_viewed' },
        { n: '本月热门', v: 'video_viewed_month' },
        { n: '本周热门', v: 'video_viewed_week' },
        { n: '今日热门', v: 'video_viewed_today' }]
    },]
  } else {
    sortfilter = [{
      key: 'sort', name: '排序', init: 'post_date', value: [
        { n: '近期最佳', v: 'post_date_and_popularity' },
        { n: '最近更新', v: 'post_date' },
        { n: '最多观看', v: 'video_viewed' },
        { n: '最高收藏', v: 'most_favourited' },]
    },]
  }
  return {
    page: page,
    pagecount: videos.length < 12 ? page : page + 1,
    list: videos,
    filter: sortfilter
  }
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const html = await request(id);
  const $ = load(html);
  let script = $('#site-content .container .col')
    .eq(0)
    .find('section')
    .eq(0)
    .find('script:last')
    .text();
  let playUrl = script.match(/var hlsUrl = '(.*)';/)[1];

  let vod = {
    vod_id: id,
    vod_name: '',
    vod_pic: '',
    vod_play_from: 'Jable',
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
  const html = await request(`${SITE}/search/${text}/?mode=async&function=get_block&block_id=list_videos_videos_list_search_result&q=${text}&sort_by=&from=${page}&_=${Date.now()}`);
  const $ = load(html);
  let videos = [];
  $('#list_videos_videos_list_search_result .container .row > div').each((_, element) => {
    const vodUrl = $(element).find('.title a').attr('href');
    const vodName = $(element).find('.title a').text();
    const vodPic = $(element).find('.img-box img').attr('data-src');
    const vodDuration = $(element).find('.label').text();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodDuration,
    });
  });
  return {
    page: page,
    pagecount: videos.length < 12 ? page : page + 1,
    list: videos,
  };
}

export default {
  meta: {
    key: 'jable',
    name: 'Jable',
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


