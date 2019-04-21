const fs = require('fs')
const axios = require('axios')
const request = require('request')
const config = require('./_config.js')
const Logger = require('./Logger.js')
const { format } = require('../lib/public.js')

class Recorder {
  constructor({roomid,nickname,httpResCallback,recEndCallback}){
    this.roomid = roomid
    this.nickname = nickname
    this.isFix = false
    this.isHttpEnd = false
    this.isFinish = false
    this.httpResCallback = httpResCallback
    this.recEndCallback = recEndCallback
    this.tmpFilename = `${format(new Date(),'MMdd')}-${this.nickname}-${(new Date()).valueOf()}.flv`
    this.start()
  }

  async start(){
    // this.url = await Recorder.getPlayUrl(this.roomid)
    this.url = await Recorder.getPlayUrl(await Recorder.getRoomId(this.roomid))
    this.rec()
  }

  rec(){
    this.tmpFilePath = `${config.tmp}${this.tmpFilename}`
    let stream = fs.createWriteStream(this.tmpFilePath)
    this.req = request({
      method: 'GET',
      url: this.url
    })
    this.req.on('end',()=>{
      // Logger.debug('http end')
      if(this.statusCode !== 200){
        // Logger.debug('请求状态错误：' + this.statusCode)
        // Logger.debug('检查文件大小')
        fs.stat(this.tmpFilePath,(err,stats)=>{
          if(err) return
          if(stats.size === 0){
            fs.unlink(this.tmpFilePath,(err)=>{
              if(err){
                // Logger.debug('删除空文件失败')
              }else{
                // Logger.debug('删除空文件成功')
              }
            })
          }
        })
      }else{
        this.isHttpEnd = true
        this.tryFix()
      }
    })
    this.req.on('abort',()=>{
      // Logger.debug('abort')
    })
    this.req.on('response',(response)=>{
      // Logger.debug('response')
      if(typeof this.httpResCallback === 'function'){
        this.httpResCallback(response.statusCode)
      }
      this.statusCode = response.statusCode
    })
    stream.on('finish',()=>{
      // Logger.debug('finish')
      this.isFinish = true
      this.tryFix()
    })
    this.req.pipe(stream)
  }

  tryFix(){
    if(this.isFinish && this.isHttpEnd){
      this.recEndCallback({tmpFilename: this.tmpFilename})
    }else{
      // Logger.debug('未满足修复条件')
      // Logger.debug(`isFinish: ${this.isFinish}`)
      // Logger.debug(`isHttpEnd: ${this.isHttpEnd}`)
    }

  }

  stop(){
    this.req.abort()
  }

  static async getRoomId(shortId){
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

  static async getPlayUrl(roomid){
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
}

module.exports = Recorder
