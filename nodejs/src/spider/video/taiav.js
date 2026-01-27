import req from '../../util/req.js';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Mobile/15E148 Safari/604.1';
const SITE = 'https://taiav.com';
const CDN = 'https://v15cdn.snmovie.com';

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
    { type_id: 'category|网红主播', type_name: '网红主播' },
    { type_id: 'category|国产', type_name: '国产' },
    { type_id: 'category|有码', type_name: '有码' },
    { type_id: 'category|无码', type_name: '无码' },
    { type_id: 'tag|Onlyfans', type_name: 'Onlyfans' },
    { type_id: 'tag|Korean Bj', type_name: 'Korean Bj' },
    { type_id: 'tag|探花', type_name: '探花' },
  ];
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

  const [tip, cls] = tid.split('|');
  const text = encodeURIComponent(cls);
  let reqUrl = `${SITE}/api/getcontents?page=${page}&size=12&${tip}=${text}&type=movie,tv`;
  const data = await request(reqUrl);
  let videos = [];
  data.forEach((e) => {
    const vodPic = `${SITE}${e.poster2.url}`;
    const vodDuration = e.duration;
    const vodPubdate = e.createAt;
    videos.push({
      vod_id: e._id.toString(),
      vod_name: e.originalname,
      vod_pic: vodPic,
      vod_remarks: 'HD',
      vod_pubdate: vodPubdate,
      vod_duration: vodDuration,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 12 ? page : page + 1,
    list: videos,
    // filter logic placeholder
    filter: [],
  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const reqUrl = `${SITE}/api/getmovie?type=1280&id=${id}`;
  const data = await request(reqUrl);
  const playUrl = `${SITE}${data.m3u8}`;

  let vod = {
    vod_id: id,
    vod_name: '',
    vod_pic: '',
    vod_play_from: 'Taiav',
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
      'Origin': SITE,
    },
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;
  const text = encodeURIComponent(wd);
  const data = await request(`${SITE}/api/getcontents?page=${page}&size=48&q=${text}&type=movie,tv`); // req 工具默认返回对象，无需 JSON.parse
  let videos = [];
  data.forEach((e) => {
    const vodPic = `${SITE}${e.poster2.url}`;
    const vodDuration = e.duration;
    const vodPubdate = e.createAt;
    videos.push({
      vod_id: e._id.toString(),
      vod_name: e.originalname,
      vod_pic: vodPic,
      vod_remarks: 'HD',
      vod_pubdate: vodPubdate,
      vod_duration: vodDuration,
    });
  });
  return {
    page: page,
    pagecount: videos.length < 48 ? page : page + 1,
    list: videos,
  };
}

export default {
  meta: {
    key: 'taiav',
    name: 'Taiav',
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
