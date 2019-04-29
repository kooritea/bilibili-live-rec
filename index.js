const {
  Worker, isMainThread, workerData
} = require('worker_threads');
const config = require('./src/_config.js')
const Logger = new (require('./src/Logger.js'))('Main')
const { sleep } = require('./lib/public.js')

if(isMainThread){
  const { listen } = require('./src/bilibilidanmu.js');
  const Recorder = require('./src/Recorder.js')
  function recready(room){
    return new Recorder({
      nickname: room.nickname,
      roomid: room.roomid,
      httpResCallback: function(code){
        if(code !== 200){
          room.try++;
          if(room.try < 10){
            setTimeout(()=>{
              recready(room)
            },20000)
          }else{
            Logger.debug(`[${room.nickname}]已重试10次失败，停止重试，状态码: ${code}`)
          }
        }
        else{
          Logger.notice(`[${room.nickname}]录制已开始`)
          room.try = 0
          room.startTimestamp = (new Date()).valueOf()//记录录制开始的时间
        }
      },
      recEndCallback: function({tmpFilename}){
        Logger.notice(`[${room.nickname}]录制已结束，开始处理: ${tmpFilename}`)
        new Worker(__filename,{
          workerData: {
            tmpFilename,
            recorderTime: (new Date()).valueOf() - room.startTimestamp
          }
        })
        recready(room)
      }
    })
  }
  (async function(){
    for(let room of config.RoomList){
      // room = {
      //   status: false,//开关播状态，true为正在直播
      //   timeout: null, // 下播的缓冲时间的setTimeoutId、防止短暂下播
      //   try: 0, // 尝试录制失败次数，开始录制后归0
      //   nickname: '夏色祭', // 播主昵称
      //   startTimestamp: 0 // 开始录制的时间戳，用于估计视频长度
      // }
      try{
        listen(room,recready)
      }catch(e){
        Logger.notice(e)
      }
      await sleep(5000)
    }
    // setTimeout(()=>{
    //   let flv = recready({
    //     nickname: 'una',
    //     roomid: 43822,
    //     status :false,
    //     timeout : null,
    //     try : 0,
    //   })
    //   setTimeout(()=>{
    //     flv.stop()
    //   },30000)
    // })
  })()
}else{
  const fs = require('fs')
  const FlVprocessor = require('./src/FLVprocessor.js')
  let {tmpFilename, recorderTime} = workerData
  new FlVprocessor({
    input: `${config.tmp}${tmpFilename}`,
    output: `${config.save}${tmpFilename}`,
    recorderTime,
    callback({ Duration }){
      if(Duration > 1){
        
      }
      Logger.notice(`处理已完成： ${tmpFilename}`)
      if(config.deleteTmp){
        fs.unlink(`${config.tmp}${tmpFilename}`, (err) => {
          if (err) throw err;
          Logger.notice(`删除临时文件：${tmpFilename}`);
        });
      }
      process.exit();
    },
    error(e){
      Logger.debug(`修复失败:${tmpFilename}`);
      Logger.debug(e)
      process.exit();
    }
  })
}
