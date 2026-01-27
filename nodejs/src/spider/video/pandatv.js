import req from '../../util/req.js';

const HEADERS = {
  'Referer': 'https://m.pandalive.co.kr/',
  'Origin': 'https://m.pandalive.co.kr',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
};
const SITE = 'https://m.pandalive.co.kr';
const API_SITE = 'https://api.pandalive.co.kr';

async function request(reqUrl, body = null) {
  const resp = body
    ? await req.post(reqUrl, body, { headers: HEADERS })
    : await req.get(reqUrl, { headers: HEADERS });
  return resp.data;
}

async function home(_inReq, _outResp) {
  let classes = [
    { type_id: 'hot|N', type_name: '最热' },
    { type_id: 'new|N', type_name: '最新' },
    { type_id: 'user|N', type_name: '顺序' },
    { type_id: 'user|Y', type_name: '新BJ' },
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

  const [orderBy, onlyNewBj] = tid.split('|');
  let offset = 0;
  let limit = 80;

  if (page > 1) {
    offset = 75 + (page - 2) * 20;
    limit = 25;
  }

  const url = `${API_SITE}/v1/live`;
  const body = {
    offset: offset,
    limit: limit,
    orderBy: orderBy,
    onlyNewBj: onlyNewBj,
  };

  const data = await request(url, body);
  let videos = [];

  if (data && data.list) {
    data.list.forEach((e) => {
      let koreaTime = new Date(e.startTime.replace(' ', 'T'));
      koreaTime.setHours(koreaTime.getHours() + 7);
      let beijingTime = koreaTime.toISOString().replace('T', ' ').slice(0, 19);
      videos.push({
        vod_id: e.userId,
        vod_name: e.title,
        vod_pic: e.thumbUrl,
        vod_remarks: e.sizeHeight + 'P',
        vod_pubdate: beijingTime,
        vod_duration: e.userNick,
      });
    });
  }

  return {
    page: page,
    pagecount: page + 1,
    list: videos,
    filter: [],
  };
}

async function detail(inReq, _outResp) {
  const userId = inReq.body.id;
  const url = `${API_SITE}/v1/live/play`;

  const body = {
    action: 'watch',
    userId: userId,
    password: '',
    shareLinkType: '',
  };

  const data = await request(url, body);
  let vod_play_url = '';
  let links = [];
  if (data > 0) {
    vod_play_url = data.PlayList.hls[0].url + '&player_version=1.22.0';

    const m3u8Data = await request(vod_play_url, { headers: HEADERS });
    const lines = m3u8Data.split('#EXT-X-MEDIA:').slice(1);
    lines.map(m3u => {
      const name = m3u.match(/NAME="(.*?)"/)[1];
      const link = m3u.match(/https?:\/\/[^\s]+\.m3u8/)[0];
      links.push({ name: name, url: link });
    })
    let vod = {
      vod_play_from: 'PandaTV',
      vod_play_url: links.map(l => l.name + '$' + l.url).join('#'),
    };
    return {
      list: [vod],
    };
  }
}

async function play(inReq, _outResp) {
  const id = inReq.body.id;
  return {
    parse: 0,
    url: id,
    header: HEADERS,
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;

  let offset = 0;
  let limit = 80;

  if (page > 1) {
    offset = 75 + (page - 2) * 20;
    limit = 25;
  }

  const url = `${API_SITE}/v1/live`;
  const body = {
    offset: offset,
    limit: limit,
    orderBy: 'user',
    searchVal: wd,
  };

  const data = await request(url, body);
  let videos = [];

  if (data && data.list) {
    data.list.forEach((e) => {
      let koreaTime = new Date(e.startTime.replace(' ', 'T'));
      koreaTime.setHours(koreaTime.getHours() + 7);
      let beijingTime = koreaTime.toISOString().replace('T', ' ').slice(0, 19);
      videos.push({
        vod_id: e.userIdx.toString() + '|' + e.userId,
        vod_name: e.title,
        vod_pic: e.thumbUrl,
        vod_remarks: e.sizeHeight + 'P',
        vod_pubdate: beijingTime,
        vod_duration: e.userNick,
      });
    });
  }

  return {
    page: page,
    pagecount: videos.length < (page > 1 ? 25 : 80) ? page : page + 1,
    list: videos,
  };
}

export default {
  meta: {
    key: 'pandatv',
    name: 'PandaTV',
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