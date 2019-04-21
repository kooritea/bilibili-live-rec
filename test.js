const FlVprocessor = require('./src/FLVprocessor.js')
const config = require('./src/_config.js')
new FlVprocessor({
  input: `${config.tmp}0421-una-1555810173107.flv`,
  // input: `${config.save}test.flv`,
  output: `${config.save}test.flv`,
  callback(){
    
  }
})