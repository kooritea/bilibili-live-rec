const {
  Worker, isMainThread, parentPort, workerData, threadId
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
            Logger.notice(`[${room.nickname}]已重试10次失败，停止重试`)
          }
        }
        else{
          Logger.notice(`[${room.nickname}]录制已开始`)
          room.try = 0
        }
      },
      recEndCallback: function({tmpFilename}){
        Logger.notice(`[${room.nickname}]录制已结束，开始检查是否重新开播`)
        new Worker(__filename,{
          workerData: tmpFilename
        })
        recready(room)
      }
    })
  }
  (async function(){
    for(let room of config.RoomList){
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
    //     lastdanmu : null,
    //     try : 0,
    //   })
    //   setTimeout(()=>{
    //     flv.stop()
    //   },5000)
    // })
  })()
}else{
  const fs = require('fs')
  const FlVprocessor = require('./src/FLVprocessor.js')
  const domain = require('domain').create();

  domain.on('error',(e)=>{
    Logger.notice(`修复失败:${config.save}${tmpFilename}`);
    Logger.notice(e)
    process.exit();
  })
  domain.run(()=>{
    let tmpFilename = workerData
    new FlVprocessor({
      input: `${config.tmp}${tmpFilename}`,
      output: `${config.save}${tmpFilename}`,
      callback(){
        Logger.notice(`处理已完成： ${config.save}${tmpFilename}`)
        if(config.deleteTmp){
          fs.unlink(`${config.tmp}${tmpFilename}`, (err) => {
            if (err) throw err;
            Logger.notice(`删除临时文件：${config.tmp}${tmpFilename}`);
          });
        }
        process.exit();
      }
    })
  })
}
