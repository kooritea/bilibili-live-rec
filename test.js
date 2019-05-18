const FlVprocessor = require('./src/FLVprocessor.js')
const config = require('./src/_config.js')

new FlVprocessor({
  noFix: true,
  recorderTime: 1000*60*50,
  input: `${config.tmp}0501-大神澪-1556715125161.flv`,
  // input: `${config.save}test.flv`,
  output: `${config.save}test.flv`,
  callback(){
    
  },
  error(e){
    console.log(e)
  }
})