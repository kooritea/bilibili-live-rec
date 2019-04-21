const Tag = require("./Tag.js")
const Logger = require('./Logger.js')

class SceiptTag extends Tag {
  constructor(buffer, offset) {
    super(buffer, offset)
    this.isNull = false
    this.AFM2Offset = 0
    this.AFM1 = {}
    this.AFM2 = []
    if(this.Datasize.value){
      this.getAFM1()
      this.getAFM2()
      this.isNull = false
    }
    else{
      this.isNull = true
    }
  }
  getAFM1() {
    this.AFM1['type'] = {
      value: this.buffer.readUIntBE(this._offset, 1).toString(10),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 1)
    }
    this._offset += 1
    this.AFM1['length'] = {
      value: this.buffer.readUIntBE(this._offset, 2).toString(10),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 2)
    }
    this._offset += 2
    let length = Number(this.AFM1['length'].value)
    this.AFM1['value'] = {
      value: this.buffer.slice(this._offset, this._offset + length).toString(),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + length)
    }
    this._offset += length
  }
  getAFM2() {
    this.AFM2Offset = this._offset
    let AFM2Datatype = this.buffer.readUIntBE(this._offset,1)
    this._offset += 1
    let scriptTagAFM2
    switch(AFM2Datatype){
      case 3:
        scriptTagAFM2 = this.getObjectData()
        break
      case 8:
        scriptTagAFM2 = this.getArrayData()
        break
      default:
        scriptTagAFM2 = []
        break
    }
    for(let i=0;i<scriptTagAFM2.length;i++){
      if(typeof scriptTagAFM2[i].value === 'string'){
        scriptTagAFM2[i].value = scriptTagAFM2[i].value.replace(/\u0000/g,'')
      }
    }
    this.AFM2 = scriptTagAFM2
  }
  setDuration(duration){
    let durationItem = this.findAFM2Key('duration')
    if(durationItem){
      this.buffer.writeDoubleBE(duration, durationItem.offset)
      durationItem.value = this.buffer.readDoubleBE(durationItem.offset)
      return {
        needUpdate: false
      }
    }else{
      this.insertDuration(duration)
      return {
        needUpdate: true
      }
    }
  }
  insertDuration(duration){
    let durationBuf = Buffer.alloc(19)//2+8+1+8
    durationBuf.writeInt16BE(8,0)
    durationBuf.write('duration',2)
    durationBuf.writeDoubleBE(duration,11)
    switch(this.buffer.readInt8(this.AFM2Offset)){
      case 3:
        //对象
        this.buffer.writeUIntBE(this.Datasize.value+19,this.Datasize.offset,3)
        this.buffer.insertBuf(this.AFM2Offset+1,durationBuf)
        // Logger.debug('对象结构且缺少duration字段')
        break
      case 8:
        //数组
        throw new Error('数组结构且缺少duration字段')
    }
  }
  findAFM2Key(name){
    for(let item of this.AFM2){
      if(item.name === name){
        return item
      }
    }
    return null
  }
}
module.exports = SceiptTag