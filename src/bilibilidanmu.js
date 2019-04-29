const axios = require('axios')
const WebSocket = require('ws');
const TextEncoder = require('util').TextEncoder;
const TextDecoder = require('util').TextDecoder;
const textEncoder = new TextEncoder('utf-8');
const textDecoder = new TextDecoder('utf-8');
const Logger = new (require('./Logger.js'))('DanmuServer')

function encode(str, op) {
  const data = textEncoder.encode(str);
  const packetLen = 16 + data.byteLength;
  const buf = Buffer.alloc(packetLen);
  buf.writeInt32BE(packetLen, 0);
  buf.writeInt16BE(16, 4); // Header Length
  buf.writeInt16BE(1, 6); // Protocol Version
  buf.writeInt32BE(op, 8); // Operation
  buf.writeInt32BE(1, 12); // Sequence Id
  buf.set(data, 16);
  return buf;
}

function decode(buf) {
  const result = {}
  result.packetLen = buf.readInt32BE(0);
  result.headerLen = buf.readInt16BE(4);
  result.ver = buf.readInt16BE(6);
  result.op = buf.readInt32BE(8);
  result.seq = buf.readInt32BE(12);
  if (result.op === 5) {
    result.body = [];
    let offset = 0;
    while (offset < buf.length) {
      const packetLen = buf.readInt32BE(offset + 0);
      const headerLen = buf.readInt16BE(offset + 4);
      const data = buf.slice(offset + headerLen, offset + packetLen);
      const body = JSON.parse(textDecoder.decode(data));
      result.body.push(body);
      offset += packetLen;
    }
  } else if (result.op === 3) {
    result.body = {
      count: buf.readInt32BE(16)
    };
  }
  return result;
}

class WSRoom {
  constructor(roomid,{opencb=[],msgcb=[],closecb=[],autorelink=true,relink=0}) {
    this.ws = new WebSocket('wss://broadcastlv.chat.bilibili.com:2245/sub');
    this.roomid = Number(roomid)
    this.ws.on('open',this.onopen.bind(this))
    this.ws.on('message',this.onmessage.bind(this))
    this.ws.on('close',this.onclose.bind(this))
    this.opencb = Array.isArray(opencb)?opencb:[opencb]
    this.msgcb = Array.isArray(msgcb)?msgcb:[msgcb]
    this.closecb = Array.isArray(closecb)?closecb:[closecb]
    this.autorelink = autorelink
    this.relink = relink
  }
  addEvent(name,funobj){
    if(Object.keys(funobj).length){
      this[name].push(funobj)
    }
  }
  delEvent(type,eventId){
    for(let fnobj of this[type]){
      if(Object.keys(fnobj)[0] === eventId){
        this[type].splice(this[type].indexOf(fnobj),1)
        break
      }
    }
  }
  onopen(){
    this.ws.send(encode(JSON.stringify({
      uid: 0,
      roomid: this.roomid
    }), 7));
    this.heartTimerId = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(encode('', 2));
      } else {
        clearInterval(this.heartTimerId);
      }
    }, 30000);
    this.opencb.forEach((cbobj)=>{
      let cb = Object.values(cbobj)[0]
      if(typeof cb === 'function'){
        cb(this)
      }
    })
  }
  onmessage(data){
    data = decode(data);
    if (data.op === 5) {
      for (let i = 0; i < data.body.length; ++i) {
        let body = data.body[i];
        this.msgcb.forEach((cbobj)=>{
          let cb = Object.values(cbobj)[0]
          if(typeof cb === 'function'){
            cb(body,this)
          }
        })
      }
    }
    if(data.op === 3){
      data.body.cmd = "HEART"
      this.msgcb.forEach((cbobj)=>{
        let cb = Object.values(cbobj)[0]
        if(typeof cb === 'function'){
          cb(data.body,this)
        }
      })
    }
  }
  async onclose(){
    clearInterval(this.heartTimerId)
    if(!this.autorelink || this.relink > 1){
      for(let fnobj of this.closecb){
        let fn = Object.values(fnobj)[0]
        if(typeof fn === 'function' && Object.prototype.toString.call(fn) === "[object AsyncFunction]"){
          await fn(this)
        }
        if(typeof fn === 'function' && Object.prototype.toString.call(fn) === "[object Function]"){
          fn(this)
        }
      }
      Rooms.splice(Rooms.indexOf(this),1)
    }else{
      setTimeout(()=>{//10s后重连
        Logger.notice('ws连接关闭，正在重连'+this.roomid)
        relink(this)
      },10000)
    }
  }
  close(){
    this.autorelink = false
    this.ws.close()
  }
}

function relink(oldRoomObj){
  if(oldRoomObj.timeout){
    clearTimeout(oldRoomObj.timeout)
  }
  let newRoomObj = new WSRoom(oldRoomObj.roomid,{
    opencb: oldRoomObj.opencb,
    msgcb: oldRoomObj.msgcb,
    closecb: oldRoomObj.closecb,
    autorelink: oldRoomObj.autorelink,
    relink: oldRoomObj.relink + 1
  })
  Rooms[Rooms.indexOf(oldRoomObj)] = newRoomObj
  newRoomObj.timeout = setTimeout(()=>{
    newRoomObj.relink = 0
    newRoomObj.timeout = null
  },900000)
}

async function getRoomid(roomid){
  if((String(roomid)).length>3) return roomid
  return (await axios({
   method: "get",
   url: `https://live.bilibili.com/${roomid}`,
   headers: {
     'Accept': '*/*',
     'User-Agent': 'Mozilla/5.0 BiliDroid/5.37.0 (bbcallen@gmail.com)'
   }
  })).data.match(/"room_id":(.*?),/)[1]
}

const Rooms = []
async function ListenRoom(roomid,{opencb,msgcb,closecb,autorelink}){
  let EventIds = {//事件id，用于解除事件绑定
    opencb: '',
    msgcb: '',
    closecb: ''
  }
  let room
  roomid = await getRoomid(roomid)
  for(let item of Rooms){
    if(item.roomid === Number(roomid)){
      room = item
      break
    }
  }
  let opencbobj = {}
  let msgcbobj = {}
  let closecbobj = {}
  if(typeof opencb === 'function'){
    let id = String((new Date()).valueOf())
    opencbobj[id] = opencb
    EventIds.opencb = id
  }
  if(typeof msgcb === 'function'){
    let id = String((new Date()).valueOf())
    msgcbobj[id] = msgcb
    EventIds.msgcb = id
  }
  if(typeof closecb === 'function'){
    let id = String((new Date()).valueOf())
    closecbobj[id] = closecb
    EventIds.closecb = id
  }
  if(room){
    room.addEvent('opencb',opencbobj)
    room.addEvent('msgcb',msgcbobj)
    room.addEvent('closecb',closecbobj)
  }else{
    room = new WSRoom(roomid,{opencb: opencbobj,msgcb: msgcbobj,closecb: closecbobj,autorelink,relink: 0})
    Rooms.push(room)
  }
  return EventIds
}
async function close(roomid){
  roomid = await getRoomid(roomid)
  for(let item of Rooms){
    if(item.roomid === Number(roomid)){
      item.close()
      Rooms.splice(Rooms.indexOf(item),1)
      break
    }
  }
}
async function delEvent(roomid,type,eventId){
  roomid = await getRoomid(roomid)
  for(let item of Rooms){
    if(item.roomid === Number(roomid)){
      item.delEvent(type,eventId)
      break
    }
  }
}
function listen(room,recready){
  if(!room.roomid) throw new Error('Not fount roomid')
  room.status = false
  room.timeout = null
  room.try = 0
  room.nickname = room.nickname?room.nickname:room.roomid
  ListenRoom(room.roomid,{
    opencb: function(){
      Logger.notice(`打开直播间链接: ${room.nickname}`)
    },
    msgcb: function(body){
      if (body.cmd === "LIVE") {
        if(!room.status){
          room.status = true
          Logger.notice(`开播通知_${room.nickname}_`)
          recready(room)
        }
        if(room.timeout){
          Logger.notice(`短暂下播重新开播_${room.nickname}_`)
          clearTimeout(room.timeout)
          room.timeout = null
        }
      }
      if (body.cmd === 'PREPARING'){
        room.timeout = setTimeout(()=>{
          Logger.notice(`下播_${room.nickname}_`)
          room.status = false
          room.timeout = null
        },900000)
      }
    },
    closecb: function(){
      Logger.notice('弹幕服务器被关闭：'+room.nickname)
    }
  })
}
module.exports = {
  listen
};
