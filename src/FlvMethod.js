class FlvMethod {
  getObjectData() {
    let result = []
    while (this.buffer.readUIntBE(this._offset, 3).toString() !== '9') {
      result.push({
        name: this.getStringData(),
        offset: this._offset + 1,
        // origin: this.slice(this.offset + 1,this.offset + 1+8),
        value: this.getDataValue()
      })
    }
    return result
  }
  getArrayData() {
    let length = Number(this.buffer.readUIntBE(this._offset, 4).toString(10))
    this._offset += 4
    let result = []
    for (let i = 0; i < length; i++) {
      result.push({
        name: this.getStringData(),
        offset: this._offset + 1,
        value: this.getDataValue()
      })
    }
    return result
  }
  getStringData() {
    let length = Number(this.buffer.readUIntBE(this._offset, 2).toString(10))
    let result = this.buffer.slice(this._offset + 2, this._offset + 2 + length).toString()
    this._offset += length + 2
    return result
  }
  getNumberData() {
    let length = 8
    let result = this.buffer.readDoubleBE(this._offset)
    this._offset += length
    return result
  }
  getBooleanData() {
    let length = 1
    let result = this.buffer.readUIntBE(this._offset, 1) == 1
    this._offset += length
    return result
  }
  getDataValue() {
    let dataType = Number(this.buffer.readUIntBE(this._offset, 1).toString(10))
    this._offset++
    switch (dataType) {
      case 0:
        //Number
        return this.getNumberData()
        break
      case 1:
        //Boolean
        return this.getBooleanData()
        break
      case 2:
        //String
        return this.getStringData()
        break
      case 3:
        //Object
        break
      case 4:
        //Number
        break
      case 5:
        //Null
        break
      case 6:
        //Undefined
        break
      case 7:
        //Reference
        break
      case 8:
        //ECMA arrray
        return 'array'
        break
    }
  }
}
module.exports = FlvMethod