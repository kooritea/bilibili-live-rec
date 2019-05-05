const Tag = require("./Tag.js")

class VideotTag extends Tag {
  constructor(buffer, offset){
    super(buffer, offset)
    this.tagBodyOffset = this._offset
    this.videoTagHeader = this.getVideoTagHeader()
  }
  getVideoTagHeader(){
    let videoTagHeader = {
      FrameType: null,
      CodecID: null,
      origin: null
    }
    videoTagHeader.origin = VideotTag.binaryFill(this.buffer.readUIntBE(this._offset, 1).toString(2), 8)
    videoTagHeader.FrameType = {
      value: parseInt(videoTagHeader.origin.slice(0,4), 2),
      origin: videoTagHeader.origin.slice(0,4),
    }
    videoTagHeader.FrameType.comment = this.getFrameTypeComment(videoTagHeader.FrameType.value)
    videoTagHeader.CodecID = {
      value: parseInt(videoTagHeader.origin.slice(4,8), 2),
      origin: videoTagHeader.origin.slice(4,8)
    }
    videoTagHeader.CodecID.comment = this.getCodecIDComment(videoTagHeader.CodecID.value)
    return videoTagHeader
  }
  getFrameTypeComment(code){
    switch(code){
      case 1:
        return 'keyframe (for AVC, a seekable frame)'
      case 2:
        return 'inter frame (for AVC, a non-seekable frame)'
      case 3:
        return 'disposable inter frame (H.263 only)'
      case 4:
        return 'generated keyframe (reserved for server use only)'
      case 5:
        return 'video info/command frame'
    }
  }
  getCodecIDComment(code){
    switch(code){
      case 1:
        return 'JPEG (currently unused)'
      case 2:
        return 'Sorenson H.263'
      case 3:
        return 'Screen video'
      case 4:
        return 'On2 VP6'
      case 5:
        return 'On2 VP6 with alpha channel'
      case 6:
        return 'Screen video version 2'
      case 7:
        return 'AVC'
    }
  }
}
module.exports = VideotTag