const Tag = require("./Tag.js")

class AudioTag extends Tag {
  constructor(buffer, offset){
    super(buffer, offset)
  }
}
module.exports = AudioTag