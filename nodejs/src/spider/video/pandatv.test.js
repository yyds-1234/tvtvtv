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

// ========== 测试函数 ==========

// 1. 测试 home - 获取分类列表
async function testHome() {
  console.log('\n=== 测试 home 函数 ===');
  console.log('输入: 无需参数');

  let classes = [
    { type_id: 'hot|N', type_name: '最热' },
    { type_id: 'new|N', type_name: '最新' },
    { type_id: 'user|N', type_name: '顺序' },
    { type_id: 'user|Y', type_name: '新BJ' },
  ];

  console.log('\n返回结果:');
  console.log(JSON.stringify({ class: classes }, null, 2));
  return classes;
}

// 2. 测试 category - 获取分类下的视频列表
async function testCategory(typeId, page = 1) {
  console.log('\n=== 测试 category 函数 ===');
  console.log(`输入: typeId="${typeId}", page=${page}`);

  const [orderBy, onlyNewBj] = typeId.split('|');
  let offset = 0;
  let limit = 80;

  if (page > 1) {
    offset = 75 + (page - 2) * 20;
    limit = 25;
  }

  console.log(`API参数: offset=${offset}, limit=${limit}, orderBy=${orderBy}, onlyNewBj=${onlyNewBj}`);

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
    console.log(`\nAPI返回数据条数: ${data.list.length}`);
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

    console.log('\n前3条视频数据:');
    console.log(JSON.stringify(videos.slice(0, 3), null, 2));
  } else {
    console.log('\nAPI返回数据为空或格式错误');
    console.log('原始返回:', data);
  }

  return {
    page: page,
    pagecount: videos.length < (page > 1 ? 25 : 80) ? page : page + 1,
    list: videos,
  };
}

// 3. 测试 detail - 获取播放详情
async function testDetail(userId) {
  console.log('\n=== 测试 detail 函数 ===');
  console.log(`输入: userId="${userId}"`);

  const url = `${API_SITE}/v1/live/play`;

  const body = {
    action: 'watch',
    userId: userId,
    password: '',
    shareLinkType: '',
  };

  const data = await request(url, body);
  console.log('\nAPI返回数据:', JSON.stringify(data, null, 2).substring(0, 500) + '...');

  let vod_play_url = '';
  let links = [];
  if (data && data.PlayList && data.PlayList.hls) {
    vod_play_url = data.PlayList.hls[0].url + '&player_version=1.22.0';
    console.log(`\nM3U8播放地址: ${vod_play_url}`);

    try {
      const m3u8Data = await request(vod_play_url);
      const lines = m3u8Data.split('#EXT-X-MEDIA:').slice(1);
      console.log(`\n解析到 ${lines.length} 个清晰度:`);

      lines.map(m3u => {
        const name = m3u.match(/NAME="(.*?)"/)[1];
        const link = m3u.match(/https?:\/\/[^\s]+\.m3u8/)[0];
        links.push({ name: name, url: link });
        console.log(`  - ${name}: ${link}`);
      });

      let vod = {
        vod_play_from: 'PandaTV',
        vod_play_url: links.map(l => l.name + '$' + l.url).join('#'),
      };
      console.log('\n最终返回:', JSON.stringify(vod, null, 2));
      return { list: [vod] };
    } catch (e) {
      console.error('\n获取M3U8数据失败:', e.message);
    }
  } else {
    console.log('\nAPI返回数据格式不正确或用户不存在/未开播');
  }
}

// 4. 测试 play - 获取播放信息
async function testPlay(playUrl) {
  console.log('\n=== 测试 play 函数 ===');
  console.log(`输入: playUrl="${playUrl.substring(0, 50)}..."`);

  const result = {
    parse: 0,
    url: playUrl,
    header: HEADERS,
  };

  console.log('\n返回结果:');
  console.log(JSON.stringify(result, null, 2));
  return result;
}

// 5. 测试 search - 搜索视频
async function testSearch(keyword, page = 1) {
  console.log('\n=== 测试 search 函数 ===');
  console.log(`输入: keyword="${keyword}", page=${page}`);

  let offset = 0;
  let limit = 80;

  if (page > 1) {
    offset = 75 + (page - 2) * 20;
    limit = 25;
  }

  console.log(`API参数: offset=${offset}, limit=${limit}, orderBy=user, searchVal=${keyword}`);

  const url = `${API_SITE}/v1/live`;
  const body = {
    offset: offset,
    limit: limit,
    orderBy: 'user',
    searchVal: keyword,
  };

  const data = await request(url, body);
  let videos = [];

  if (data && data.list) {
    console.log(`\nAPI返回数据条数: ${data.list.length}`);
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

    console.log('\n搜索结果:');
    console.log(JSON.stringify(videos, null, 2));
  } else {
    console.log('\nAPI返回数据为空或格式错误');
    console.log('原始返回:', data);
  }

  return {
    page: page,
    pagecount: videos.length < (page > 1 ? 25 : 80) ? page : page + 1,
    list: videos,
  };
}

// ========== 交互式测试菜单 ==========

async function showMenu() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     PandaTV Spider 测试脚本           ║');
  console.log('╠════════════════════════════════════════╣');
  console.log('║  1. 测试 home (获取分类列表)          ║');
  console.log('║  2. 测试 category (获取视频列表)      ║');
  console.log('║  3. 测试 detail (获取播放详情)        ║');
  console.log('║  4. 测试 play (获取播放信息)          ║');
  console.log('║  5. 测试 search (搜索视频)            ║');
  console.log('║  6. 完整流程测试                     ║');
  console.log('║  0. 退出                             ║');
  console.log('╚════════════════════════════════════════╝');
}

async function fullFlowTest() {
  console.log('\n========== 开始完整流程测试 ==========');

  // Step 1: 获取分类
  console.log('\n--- Step 1: 获取分类列表 ---');
  const classes = await testHome();

  // Step 2: 获取第一个分类的视频
  console.log('\n--- Step 2: 获取视频列表 ---');
  const categoryId = classes[0].type_id;
  console.log(`使用分类: ${classes[0].type_name} (${categoryId})`);
  const categoryResult = await testCategory(categoryId, 1);

  if (categoryResult.list.length > 0) {
    const firstVideo = categoryResult.list[0];
    console.log(`\n选中第一个视频: ${firstVideo.vod_name}`);

    // Step 3: 获取播放详情
    console.log('\n--- Step 3: 获取播放详情 ---');
    const detailResult = await testDetail(firstVideo.vod_id);

    if (detailResult && detailResult.list && detailResult.list[0]) {
      const playUrls = detailResult.list[0].vod_play_url.split('#');
      if (playUrls.length > 0) {
        const firstPlayUrl = playUrls[0].split('$')[1];
        console.log('\n--- Step 4: 获取播放信息 ---');
        await testPlay(firstPlayUrl);
      }
    }
  } else {
    console.log('\n没有可用的视频进行后续测试');
  }

  // Step 5: 测试搜索
  console.log('\n--- Step 5: 测试搜索功能 ---');
  await testSearch('BJ', 1);

  console.log('\n========== 完整流程测试结束 ==========');
}

// ========== 主程序 ========== let lastUserId = null; let lastPlayUrl = null;

async function main() {
  while (true) {
    await showMenu();
    const choice = await prompt('\n请选择测试项目 (0-6): ');

    switch (choice.trim()) {
      case '1':
        await testHome();
        break;

      case '2':
        const typeId = await prompt('请输入分类ID (如 hot|N, new|N, user|N, user|Y): ') || 'hot|N';
        const page = await prompt('请输入页码 (默认1): ') || '1';
        await testCategory(typeId, parseInt(page));
        break;

      case '3':
        const userId = await prompt('请输入userId (或使用上次结果): ') || lastUserId;
        if (!userId) {
          console.log('请先运行 category 或 search 获取 userId');
          break;
        }
        const detailResult = await testDetail(userId);
        if (detailResult && detailResult.list && detailResult.list[0]) {
          const playUrls = detailResult.list[0].vod_play_url.split('#');
          if (playUrls.length > 0) {
            lastPlayUrl = playUrls[0].split('$')[1];
            console.log(`\n已保存播放地址，可用于 play 测试`);
          }
        }
        break;

      case '4':
        const playUrl = await prompt('请输入播放地址 (或使用上次结果): ') || lastPlayUrl;
        if (!playUrl) {
          console.log('请先运行 detail 获取播放地址');
          break;
        }
        await testPlay(playUrl);
        break;

      case '5':
        const keyword = await prompt('请输入搜索关键词: ') || 'BJ';
        const searchPage = await prompt('请输入页码 (默认1): ') || '1';
        await testSearch(keyword, parseInt(searchPage));
        break;

      case '6':
        await fullFlowTest();
        break;

      case '0':
        console.log('\n退出测试脚本');
        return;

      default:
        console.log('\n无效的选择，请重新输入');
    }

    if (choice.trim() !== '0') {
      const continueChoice = await prompt('\n按回车继续，输入 q 退出: ');
      if (continueChoice.toLowerCase() === 'q') {
        console.log('\n退出测试脚本');
        return;
      }
    }
  }
}

// 简单的 prompt 实现
function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

// 运行主程序
main().catch(console.error);
