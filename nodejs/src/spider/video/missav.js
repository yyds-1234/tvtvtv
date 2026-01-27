import { all } from 'axios';
import req from '../../util/req.js';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0';
const DEFAULT_SITE = 'https://missav.live';
const DB_PATH = '/actorFilters';
const SITE_DB_PATH = '/missavSite';
let actorList = [];
/**
 * 获取演员筛选列表
 * @param {Object} db - 数据库实例
 * @returns {Array<string>} 演员名称数组，用户配置的演员筛选列表
 */
async function getActorList(db) {
  try {
    const data = await db.getData(DB_PATH);
    const actorsStr = data.missav || '';
    if (!actorsStr) return [];
    return actorsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
  } catch {
    return [];
  }
}

/**
 * 获取用户配置的 MissAV 网站域名
 * @param {Object} db - 数据库实例
 * @returns {string} 网站域名，默认为 https://missav.live
 */
async function getSite(db) {
  try {
    const data = await db.getData(SITE_DB_PATH);
    const site = data.missav || '';
    if (!site) return DEFAULT_SITE;
    // 确保域名以 https:// 开头
    return site.startsWith('http') ? site : `https://${site}`;
  } catch {
    return DEFAULT_SITE;
  }
}

async function request(reqUrl) {
  const resp = await req.get(reqUrl, {
    headers: {
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/plain, */*',
      'connection': 'close',
      'Accept-Encoding': 'gzip, compress, deflate, br',
    },
  });
  return resp.data;
}

async function home(inReq, _outResp) {
  let classes = [
    { type_id: 'dm265/cn/chinese-subtitle', type_name: '中文字幕' },
    { type_id: 'dm513/cn/new', type_name: '最近更新' },
    { type_id: 'dm509/cn/release', type_name: '新作上市' },
    { type_id: 'dm561/cn/uncensored-leak', type_name: '无码' },
    { type_id: 'dm168/cn/weekly-hot', type_name: '本週热门' },
    { type_id: 'dm207/cn/monthly-hot', type_name: '本月热门' },
    { type_id: 'dm95/cn/fc2', type_name: 'FC2' },
    { type_id: 'dm34/cn/madou', type_name: '麻豆' },
  ];

  // 获取演员筛选列表 - 类型: Array<string>，用户配置的演员名称列表
  actorList = await getActorList(inReq.server.db);

  return {
    class: classes,
  };
}

async function category(inReq, _outResp) {
  let tid = inReq.body.id;
  const pg = inReq.body.page;
  // extend - 类型: Object，外部传递的筛选条件，例如 { actor: '演员名称', filter: '筛选条件', sort: '排序方式' }
  const extend = inReq.body.filters || {};
  let page = pg || 1;
  if (page == 0) page = 1;
  if (extend.actor && extend.actor !== 'all') {
    tid = `cn/actresses/${encodeURIComponent(extend.actor)}`;
  }
  if (extend.filter && extend.filter !== 'all') {
    tid += `?filters=${extend.filter}`;
  }
  if (extend.sort) {
    const sep = tid.includes('?') ? '&' : '?';
    tid += `${sep}sort=${extend.sort}`;
  }
  //如果tid中没有？则page前为？否则为&
  if (!tid.includes('?')) {
    tid += `?page=${page}`;
  } else {
    tid += `&page=${page}`;
  }
  const site = await getSite(inReq.server.db);
  let reqUrl = `${site}/${tid}`;
  const html = await request(reqUrl);
  const $ = load(html);
  let videos = [];
  $('.thumbnail').each((_, e) => {
    const vodUrl = $(e).find('.text-secondary').attr('href');
    const vodName = $(e).find('.text-secondary').text().trim().replace(/\s+/g, ' ');
    const vodPic = $(e).find('.w-full').attr('data-src');
    const vodRemarks = $(e).find('.left-1').text().trim();
    const vodDuration = $(e).find('.right-1').text().trim();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodRemarks,
      vod_duration: vodDuration,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 12 ? page : page + 1,
    list: videos,
    filter:
      [
        {
          key: 'filter', name: '筛选', init: 'all',
          value: [
            { "n": '全部', "v": 'all' },
            { "n": '单人作品', "v": 'individual' },
            { "n": '多人作品', "v": 'multiple' },
            { "n": '中文字幕', "v": 'chinese-subtitle' },
          ]
        },
        {
          key: 'sort', name: '排序', init: 'released_at', value: [
            { "n": '发行时间', "v": 'released_at' },
            { "n": '最近更新', "v": 'published_at' },
            { "n": '收藏数', "v": 'saved' },
            { "n": '今日浏览数', "v": 'today_views' },
            { "n": '本周浏览数', "v": 'weekly_views' },
            { "n": '本月浏览数', "v": 'monthly_views' },
            { "n": '总浏览数', "v": 'views' },
          ],
        },
        {
          key: 'actor',
          name: '演员筛选',
          // 演员列表 - Array<string> 类型，由外部客户端进行筛选
          init: 'all',
          value: [{
            n: '全部', v: 'all',
          },
          // 动态生成演员筛选列表
          ...actorList.map(actor => ({
            n: actor,
            v: actor,
          }))
          ],
        },
      ],
  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const html = await request(id);
  let m3u8Prefix = 'https://surrit.com/';
  let m3u8Suffix = '/playlist.m3u8';

  const match = html.match(/nineyu\.com\\\/(.+)\\\/seek\\\/_0\.jpg/);
  let playUrls = [];
  if (match && match[1]) {
    let uuid = match[1];
    const data1 = await request(m3u8Prefix + uuid + m3u8Suffix);
    const lines = data1.split('\n');
    const matches = lines.filter(line => line.includes('/video.m3u8'));

    // 解析所有分辨率并找出最高分辨率
    let qualityMap = [];
    matches.forEach(match => {
      const name = match.replace('/video.m3u8', '');
      // 支持多种分辨率格式: 720p, 1080p 或 1280x720, 1920x1080
      const qualityMatch = name.match(/(\d+)p|(\d+)x(\d+)/);
      if (qualityMatch) {
        // 如果是 720p 格式，取 group[1]；如果是 1280x720 格式，取 group[3]（高度）
        const resolution = parseInt(qualityMatch[1] || qualityMatch[3]);
        qualityMap.push({
          name: name,
          resolution: resolution,
          url: `${m3u8Prefix}${uuid}/${match}`,
        });
      }
    });

    // 按分辨率降序排序，只保留最高分辨率
    if (qualityMap.length > 0) {
      qualityMap.sort((a, b) => b.resolution - a.resolution);
      const highest = qualityMap[0];
      playUrls.push({
        name: highest.name,
        url: highest.url,
      });
    }
  }

  let vod = {
    vod_id: id,
    vod_name: '',
    vod_pic: '',
    vod_play_from: 'MissAV',
    vod_play_url: playUrls.map(p => `${p.name}$${p.url}`).join('#'),
  };

  return {
    list: [vod],
  };
}

async function play(inReq, _outResp) {
  const flag = inReq.body.flag;
  const id = inReq.body.id;
  const site = await getSite(inReq.server.db);
  return {
    parse: 0,
    url: id,
    header: {
      'User-Agent': UA,
      'Referer': site,
    },
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;
  const text = encodeURIComponent(wd);
  const site = await getSite(inReq.server.db);
  const html = await request(`${site}/cn/search/${text}?page=${page}`);
  const $ = load(html);
  let videos = [];
  $('.thumbnail').each((_, e) => {
    const vodUrl = $(e).find('.text-secondary').attr('href');
    const vodName = $(e).find('.text-secondary').text().trim().replace(/\s+/g, ' ');
    const vodPic = $(e).find('.w-full').attr('data-src');
    const vodRemarks = $(e).find('.left-1').text().trim();
    const vodDuration = $(e).find('.right-1').text().trim();
    videos.push({
      vod_id: vodUrl,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodRemarks,
      vod_duration: vodDuration,
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
    key: 'missav',
    name: 'MissAV',
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

//https://missav.live/cn/actresses/%E6%9D%BE%E6%9C%AC%E8%8A%BD%E4%BE%9D?filters=multiple
// 全部：
// 单人作品：individual
// 多人作品；multiple
// 中文字幕：chinese-subtitle
// 发行时间：&sort=released_at
// 最近更新：&sort=published_at
// 收藏数： &sort=saved
// 今日浏览数： &sort=today_views
// 本周浏览数： &sort=weekly_views
// 本月浏览数： &sort=monthly_views
// 总浏览数： &sort=views