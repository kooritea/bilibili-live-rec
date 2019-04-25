const d = require('domain').create();
const FlVprocessor = require('./src/FLVprocessor.js')
const config = require('./src/_config.js')
d.on('error',(e)=>{
  console.log('处理失败')
  console.log(e)
})
d.run(()=>{
  new FlVprocessor({
    noFix: true,
    input: `${config.tmp}0423-夏色祭-1556017337204.flv`,
    // input: `${config.save}test.flv`,
    output: `${config.save}test.flv`,
    callback(){
      
    }
  })
})