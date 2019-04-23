const config = require('../config.js')
const fs = require('fs')
const path = require('path')

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
mkdirsSync(config.save)
mkdirsSync(config.tmp)

module.exports = config