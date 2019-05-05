const {
  Worker, isMainThread, workerData
} = require('worker_threads');
const config = require('./src/_config.js')
const Logger = new (require('./src/Logger.js'))('Main')
const { sleep } = require('./lib/public.js')

if(isMainThread){
  const { listen } = require('./src/bilibilidanmu.js');
  const Recorder = require('./src/Recorder.js')
  const { getRoomId, isLive } = require('./src/bilibili-api.js')

  const Recorders = [] //所有录制对象都放在这里，用于退出时中断
  let Threads = 0 //子线程数量
  let exit = false //线程退出会检查这个变量。如果为真则退出程序

  function recready(room){
    Recorders.push(new Recorder({
      nickname: room.nickname,
      roomid: room.roomid,
      httpResCallback: function(code, retry){
        if(code !== 200){
          room.try++;
          if(room.try < 15){// bilibilidanmu模块设置了15分钟下播缓冲防止断线后重复录制，这里每60s重试一次，重试15次
            setTimeout(()=>{
              if(retry){
                recready(room)
              }  
            },60000)
          }else{
            room.try = 0
            Logger.debug(`[${room.nickname}]已重试15次失败，停止重试，状态码: ${code}`)
          }
        }
        else{
          Logger.notice(`[${room.nickname}]录制已开始`)
          room.try = 0
          room.startTimestamp = (new Date()).valueOf()//记录录制开始的时间
        }
      },
      recEndCallback: function({tmpFilename, nickname, time, retry}){
        Logger.notice(`[${room.nickname}]录制已结束，开始处理: ${tmpFilename}`)
        let worker = new Worker(__filename,{
          workerData: {
            tmpFilename,
            nickname,
            time,
            recorderTime: (new Date()).valueOf() - room.startTimestamp
          }
        })
        Threads++;
        if(retry){
          recready(room)
        }
        worker.on('exit', ()=>{
          Threads--;
          if(Threads === 0 && exit){
            process.exit()
          }
        }) 
      }
    }))
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
      room.status = false
      room.timeout = null
      room.try = 0
      room.nickname = room.nickname?room.nickname:room.roomid
      try{
        room.roomid = await getRoomId(room.roomid)//短id转换
        room.status = await isLive(room.roomid)
        if(room.status){
          recready(room)
        }
        listen(room,recready)
      }catch(e){
        Logger.notice(e)
      }
      await sleep(5000)
    }
    process.on('SIGINT', function () {
      console.log()//打印一个空行，美观
      Recorders.forEach((item)=>{
        item.stop()
      })
      exit = true
      // process.exit();
    });
    // setTimeout(()=>{
    //   recready({
    //     nickname: 'una',
    //     roomid: 43822,
    //     status :false,
    //     timeout : null,
    //     try : 0,
    //   })
    // })
  })()
}else{
  const fs = require('fs')
  const FlVprocessor = require('./src/FLVprocessor.js')
  let { tmpFilename, nickname, time, recorderTime } = workerData
  new FlVprocessor({
    input: `${config.tmp}${tmpFilename}`,
    output: `${config.save}${time}-${nickname}.flv`,
    recorderTime,
    callback({ Duration }){
      if(Duration > 1){
        
      }
      Logger.notice(`处理已完成： ${time}-${nickname}.flv`)
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
