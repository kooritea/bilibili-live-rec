function format(time, format){
  let t = new Date(time);                                                //format(time, 'yyyy/MM/dd HH:mm:ss');
    let tf = function (i) {return (i < 10 ? '0' : '') + i};
    return format.replace(/yyyy|MM|dd|HH|mm|ss|DD/g, function(a) {
      switch(a){
        case 'yyyy':
          return tf(t.getFullYear());
          break;
        case 'MM':
          return tf(t.getMonth() + 1);
          break;
        case 'mm':
          return tf(t.getMinutes());
          break;
        case 'dd':
          return tf(t.getDate());
          break;
        case 'HH':
          return tf(t.getHours());
          break;
        case 'ss':
          return tf(t.getSeconds());
          break;
        case 'DD':
          return zhDay(t.getDay())
          break;
      }
    })
}
function sleep(time){
  return new Promise(function(resolve, reject) {
    setTimeout(()=>{
      resolve()
    },time)
  });
}
module.exports = {
  format,
  sleep
}
