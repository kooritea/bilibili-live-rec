const FlVprocessor = require('./src/FLVprocessor.js')
const config = require('./src/_config.js')

new FlVprocessor({
  // noFix: true,
  input: `${config.tmp}0403-夏色祭-0.flv`,
  // input: `${config.save}test.flv`,
  output: `${config.save}test.flv`,
  callback(){
    
  },
  error(e){
    console.log(e)
  }
})