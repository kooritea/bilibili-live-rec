const Tag = require("./Tag.js")

class AudioTag extends Tag {
  constructor(buffer, offset){
    super(buffer, offset)
    this.tagBodyOffset = this._offset
  }
}
module.exports = AudioTag