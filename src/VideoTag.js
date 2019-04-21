const Tag = require("./Tag.js")

class VideotTag extends Tag {
  constructor(buffer, offset){
    super(buffer, offset)
  }
}
module.exports = VideotTag