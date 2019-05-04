const axios = require('axios')

async function getRoomId(shortId){
  let res = await axios({
    method: "get",
    url: `https://live.bilibili.com/${shortId}`,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Host': 'live.bilibili.com',
      'Cache-Control': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.103 Safari/537.36 Vivaldi/2.1.1337.47'
    }
  })
  return res.data.match(/"room_id":(.*?),/)[1]
}

async function getPlayUrl(roomid){
  let res = (await axios({
    method: 'get',
    url: `https://api.live.bilibili.com/room/v1/Room/playUrl?cid=${roomid}&quality=0&platform=web`,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Host': 'api.live.bilibili.com',
      'Cache-Control': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.103 Safari/537.36 Vivaldi/2.1.1337.47'
    }
  })).data
  if(res.data.durl.length > 0){
    return res.data.durl[0].url
  }else{
    throw {
      type: 'KNOW',
      msg: '没有可用的直播流地址'
    }
  }
}

async function isLive(roomid){
  return (await axios.get(`https://api.live.bilibili.com/room/v1/Room/mobileRoomInit?id=${roomid}`)).data.data.live_status === 1
}
module.exports = {
  getRoomId,
  getPlayUrl,
  isLive
}