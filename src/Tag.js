const FlvMethod = require('./FlvMethod.js')

class Tag extends FlvMethod {
  constructor(buffer, offset) {
    super()
    this.isBad = false //是否是一个完整的tag
    this.offset = offset //tag在整个BigBuffer中的开始偏移量
    this.buffer = buffer //BigBuffer对象
    this._offset = offset //活动和的偏移量 扫描到的地方的指针
    this.PreviousLen = {} //上一个tag的长度
    this.Type = {} //类型
    this.Datasize = {} //内容长度
    this.Timestamp = {} //时间戳
    this.Timestamp_ex = {} //时间戳扩展位
    this.StreamID = {} //id
    this.length = 0 //总长度，总是等于Datasize+11(header)+4(PreviousLen)

    this.initTagHeader()

  }
  initTagHeader() {
    if (this.buffer.length - this._offset < 15) {
      this.isBad = true
      return
    }

    this.PreviousLen = {
      value: Number(this.buffer.readUIntBE(this._offset, 4).toString(10)),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 4)
    }
    this._offset += 4

    let type = Number(this.buffer.readUIntBE(this._offset, 1).toString(10))
    switch(type){
      case 8:
        type = 'audio';
        break
      case 9:
        type = 'video';
        break
      case 18:
        type = 'script';
        break
      default:
        type = 'unknow'
    }
    this.Type = {
      value: type,
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 1)
    }
    this._offset += 1

    this.Datasize = {
      value: Number(this.buffer.readUIntBE(this._offset, 3).toString(10)),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 3)
    }
    this._offset += 3

    this.Timestamp = {
      value: Number(this.buffer.readUIntBE(this._offset, 3).toString(10)),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 3)
    }
    this._offset += 3

    this.Timestamp_ex = {
      value: this.buffer.slice(this._offset, this._offset + 1),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 1)
    }
    this._offset += 1

    this.StreamID = {
      value: Number(this.buffer.readUIntBE(this._offset, 3).toString(10)),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 3)
    }
    this._offset += 3

    this.length = this.Datasize.value + 15

    if (this.buffer.length - this._offset < this.Datasize.value) {
      this.isBad = true
      return
    }
  }
  getTimestamp(){
    let timestampBuffer = Buffer.concat([this.Timestamp_ex.origin, this.Timestamp.origin])
    return Number(timestampBuffer.readUIntBE(0, 4).toString(10))
  }
  setTimestamp(int){
    let timestampBuffer = Buffer.alloc(4)
    timestampBuffer.writeUIntBE(int,0,4)
    this.buffer.writeUIntBE(timestampBuffer.readUIntBE(1,3),this.Timestamp.offset,3)
    this.Timestamp.origin = timestampBuffer.slice(1,4)
    this.Timestamp.value = Number(timestampBuffer.readUIntBE(1,3).toString(10))
    this.buffer.writeUIntBE(timestampBuffer.readUIntBE(0,1),this.Timestamp_ex.offset,1)
    this.Timestamp_ex.origin = timestampBuffer.slice(0,1)
  }
}
module.exports = Tag