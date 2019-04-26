const fs = require('fs')
const MAX_LENGTH = require('buffer').constants.MAX_LENGTH

class BigBuffer {
  constructor(args) {
    this.highWaterMark = parseInt(MAX_LENGTH / 2) // 单次读取文件大小
    this.autoRead = false //是否初始化类的时候马上读取文件
    this.buffers = [] // 储存分割的buffer
    this.length = 0 // buffer总长度
    this.readcb = null // 文件读取完的回调

    switch (typeof args) {
      case 'string':
        this.filepath = args
        break
      case 'object':
        let { filepath, highWaterMark, autoRead = false, readcb } = args
        this.filepath = filepath
        this.highWaterMark = highWaterMark ? highWaterMark : this.highWaterMark
        this.autoRead = autoRead
        this.readcb = readcb
        break
    }
    if (!this.filepath) {
      throw new Error('Not Found FilePath')
    }
    if (this.autoRead) {
      this.readFile()
    }
  }
  readFile() {
    return new Promise((reslove, reject) => {
      let bufferIndex = 0
      let readStream = fs.createReadStream(this.filepath, { highWaterMark: this.highWaterMark })//100mb
      readStream.on('data', (chunk) => {
        this.length += chunk.length
        this.buffers[bufferIndex] = chunk
        bufferIndex++;
        // console.log(`load: ${this.length/this.highWaterMark}GB`)
      })
      readStream.on('end', () => {
        if (typeof this.readcb === 'function') {
          this.readcb()
        }
        reslove()
      })
      readStream.on('error', (e) => {
        reject(e)
      })
    })
  }

  saveFile(outpath){
    return new Promise((reslove) => {
      let stream = fs.createWriteStream(outpath)
      let i = 0
      let nextWrite = ()=>{
        stream.write(this.buffers[i],()=>{
          i++;
          if(this.buffers[i]){
            nextWrite()
          }
          else{
            stream.end()
            reslove()
          }
        })
      }
      nextWrite()
    })
    
  }

  slice(start, end) {
    let { offsetDiffer, buffer } = this._getBuffer(start, end - start)
    start = start - offsetDiffer
    end = end - offsetDiffer
    return buffer.slice(start, end)
  }
  readUIntBE(offset, length) {
    let { offsetDiffer, buffer } = this._getBuffer(offset, length)
    offset = offset - offsetDiffer
    return buffer.readUIntBE(offset, length)
  }
  readDoubleBE(offset) {
    let { offsetDiffer, buffer } = this._getBuffer(offset, 8)
    offset = offset - offsetDiffer
    return buffer.readDoubleBE(offset)
  }
  readUInt8(offset) {
    let { offsetDiffer, buffer } = this._getBuffer(offset, 1)
    offset = offset - offsetDiffer
    return buffer.readUInt8(offset)
  }
  writeUIntBE(data, offset, len) {
    let { isDivision, offsetDiffer, buffer } = this._getBuffer(offset, len)
    offset = offset - offsetDiffer
    if (!isDivision) {
      return buffer.writeUIntBE(data, offset, len)
    } else {
      //当写入位置是分界中间时
      let dataBuffer = Buffer.alloc(len)
      dataBuffer.writeUIntBE(data, 0, len)
      let { index } = this._getBufferIndex(offset)
      for(let i = 0;i<this.buffers[index].length - offset;i++){
        this.buffers[index][offset + i] = dataBuffer[i]
      }
      for(let i = 0;i<dataBuffer.length - (this.buffers[index].length - offset);i++){
        this.buffers[index+1][i] = dataBuffer[(this.buffers[index].length - offset) + i]
      }
    }
  }
  writeDoubleBE(data, offset) {
    let { isDivision, offsetDiffer, buffer } = this._getBuffer(offset, 8)
    offset = offset - offsetDiffer
    if (!isDivision) {
      return buffer.writeDoubleBE(data, offset)
    } else {
      //当写入位置是分界中间时
      let dataBuffer = Buffer.alloc(8)
      dataBuffer.writeDoubleBE(data)
      let { index } = this._getBufferIndex(offset)
      for(let i = 0;i<this.buffers[index].length - offset;i++){
        this.buffers[index][offset + i] = dataBuffer[i]
      }
      for(let i = 0;i<dataBuffer.length - (this.buffers[index].length - offset);i++){
        this.buffers[index+1][i] = dataBuffer[(this.buffers[index].length - offset) + i]
      }
    }
  }
  insertBuf(offset, data) {
    let { buffer, index } = this._getBufferIndex(offset)
    if (buffer.length + data.length < MAX_LENGTH) {
      //插入buffer不会越界
      this.buffers[index] = Buffer.concat([buffer.slice(0, offset), data, buffer.slice(offset)])
    } else {
      //插入后越界
      throw new Error('插入buffer后越界')
    }
    this.length += data.length
  }
  _getBufferIndex(offset) {//获取偏移量所在的buffer
    let read = 0//已读取的buffer长度
    for (let i = 0; i < this.buffers.length; i++) {
      if (this.buffers[i].length >= (offset - read)) {
        return {
          index: i,
          buffer: this.buffers[i]
        }
      }
      else {
        read += this.buffers[i].length
      }
    }
    throw 'not found buffer'
  }
  _getBuffer(offset, length) {
    let { buffer, index } = (this._getBufferIndex(offset))
    let offsetDiffer = 0
    for(let i=0;i<index;i++){
      offsetDiffer += this.buffers[i].length
    }
    if (buffer.length >= offset - offsetDiffer + length) {
      return {
        buffer,
        offsetDiffer,
        isDivision: false
      }
    } else {
      //需要的数据在两个buffer之间
      //返回从偏移量开始的大于需要长度的复制buffer，只读
      let nextBuffer = (this._getBufferIndex(offset + length)).buffer
      return {
        buffer: Buffer.concat([buffer.slice(offset - offsetDiffer), nextBuffer.slice(0, length)]),
        offsetDiffer: offset,//偏移量修正值，原来的偏移量要减去这个修正值
        isDivision: true
      }
    }
  }
}
module.exports = BigBuffer