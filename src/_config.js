const fs = require('fs')
const path = require('path')
const {
  isMainThread
} = require('worker_threads');

const config = require('../config.js')
const Logger = new (require('./Logger.js'))('Config')

function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}
config.save = path.resolve(process.cwd(), config.save?config.save:'./output') + '/'
config.tmp = path.resolve(process.cwd(), config.tmp?config.tmp:'./output/tmp') + '/'
if(isMainThread){
  if(!fs.existsSync(config.save)){
    mkdirsSync(config.save)
    Logger.notice(`保存路径不存在，已创建`)
  }
  if(!fs.existsSync(config.tmp)){
    mkdirsSync(config.tmp)
    Logger.notice(`临时保存路径不存在，已创建`)
  }
  Logger.notice(`保存路径: ${config.save}`)
  Logger.notice(`临时保存路径: ${config.tmp}`)
}

module.exports = config