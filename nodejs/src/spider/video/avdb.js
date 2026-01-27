import req from '../../util/req.js';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)';
const SITE = 'https://avdbapi.com/api.php/provide/vod';

async function request(reqUrl) {
  const resp = await req.get(reqUrl, {
    headers: {
      'User-Agent': UA,
    },
  });
  return resp.data;
}
async function home(_inReq, _outResp) {
  const url = SITE;
  const data = await request(url);
  let classes = [];

  if (data && data.class) {
    data.class.forEach((e) => {
      classes.push({
        type_id: e.type_id,
        type_name: e.type_name,
      });
    });
  }

  return {
    class: classes,
  };
}

async function category(inReq, _outResp) {
  const tid = inReq.body.id;
  const pg = inReq.body.page;
  let page = pg || 1;
  if (page == 0) page = 1;

  const url = SITE + `?t=${tid}&ac=detail&pg=${page}`;
  const data = await request(url);
  let videos = [];

  if (data && data.list) {
    data.list.forEach((e) => {
      videos.push({
        vod_id: `${e.id}`,
        vod_name: e.name,
        vod_pic: e.poster_url,
        vod_remarks: e.tag,
        vod_pubdate: e.created_at,
        vod_duration: e.time,
      });
    });
  }

  return {
    page: page,
    pagecount: videos.length < 20 ? page : page + 1,
    list: videos,
    filter: [],
  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  const url = SITE + `?ac=detail&ids=${id}`;
  const data = await request(url);
  let vod_play_url = '';
  if (data && data.list && data.list[0] && data.list[0].episodes) {
    const embedUrl = data.list[0].episodes.server_data.Full.link_embed;
    const embedData = await req.get(embedUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://avdbapi.com/',
      },
    });

    const html = embedData.data;
    const objMatch = html.match(/playerInstance\.setup\(\s*(\{[\s\S]*?\})\s*\);/);
    if (objMatch && objMatch[1]) {
      const obj = objMatch[1];
      const aboutlinkMatch = obj.match(/aboutlink:\s*["']([^"']+)["']/);
      const fileMatch = obj.match(/file:\s*["']([^"']+)["']/);
      if (aboutlinkMatch && fileMatch) {
        vod_play_url = embedUrl + '@' + aboutlinkMatch[1] + fileMatch[1];
      }
    }
  }

  let vod = {
    vod_id: id,
    vod_name: data.list[0].name,
    vod_pic: data.list[0].poster_url,
    vod_play_from: 'Avdb',
    vod_play_url: '播放$' + vod_play_url,
  };

  return {
    list: [vod],
  };
}

async function play(inReq, _outResp) {
  const id = inReq.body.id;
  const parts = id.split('@');
  const url = parts[0];
  const playUrl = parts[1];
  return {
    parse: 0,
    url: playUrl,
    header: {
      'User-Agent': UA,
      'Referer': `${url}/`,
    },
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;

  const text = encodeURIComponent(wd);
  const url = `${SITE}?ac=detail&wd=${text}&pg=${page}`;
  const data = await request(url);
  let videos = [];

  if (data && data.list) {
    data.list.forEach((e) => {
      videos.push({
        vod_id: `${e.id}`,
        vod_name: e.name,
        vod_pic: e.poster_url,
        vod_remarks: e.tag,
        vod_pubdate: e.created_at,
        vod_duration: e.time,
      });
    });
  }

  return {
    page: page,
    pagecount: videos.length < 20 ? page : page + 1,
    list: videos,
  };
}

export default {
  meta: {
    key: 'avdb',
    name: 'Avdb',
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
