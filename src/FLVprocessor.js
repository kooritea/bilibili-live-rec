const BigBuffer = require("../lib/BigBuffer.js")
const ScriptTag = require("./ScriptTag.js")
const VideoTag = require("./VideoTag.js")
const AudioTag = require("./AudioTag.js")
const Tag = require("./Tag.js")
const Logger = new (require("./Logger.js"))('FLVprocessor')

class FLVprocessor {
  constructor(args) {
    switch (typeof args) {
      case 'string':
        this.input = args
        break
      case 'object':
        let { input, output, callback, noFix, error } = args
        this.input = input
        this.output = output
        this.callback = callback
        this.noFix = noFix
        this.error = error
        break
    }
    this.buffer = new BigBuffer(this.input)
    this._offset = 0
    this.flvHeader = {}
    this.scriptTags = []
    this.videoTags = []
    this.audioTags = []
    this.tags = []
    this.output = this.output ? this.output : `${this.input}.fix.flv`
    this.readFile()
  }
  async readFile() {
    try {
      await this.buffer.readFile()
      this.updateInfo()
      if (!this.noFix) {
        await this.buffer.saveFile(this.output)
      }
      if (typeof this.callback === 'function') {
        this.callback()
      }
    } catch (e) {
      if (typeof this.error === 'function') {
        this.error(e)
      }
    }

  }
  updateInfo() {
    this._offset = 0
    this.flvHeader = {}
    this.scriptTags = []
    this.videoTags = []
    this.audioTags = []
    this.tags = []
    this.getFlvHeader()
    this.getTags()
    if (!this.scriptTags.length) throw '缺少控制帧'
    if (!this.videoTags.length && this.scriptTags.length) throw '缺少数据帧'
    this.fixTimestamp()
    this.fixDuration()
  }
  getFlvHeader() {
    this.flvHeader['Signature'] = {
      value: this.buffer.slice(this._offset, this._offset + 3).toString(),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 3)
    }
    this._offset += 3
    this.flvHeader['Version'] = {
      value: this.buffer.readUIntBE(this._offset, 1),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 1)
    }
    this._offset += 1
    this.flvHeader['Flags'] = {
      value: FLVprocessor.binaryFill(this.buffer.readUIntBE(this._offset, 1).toString(2), 8),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 1)
    }
    this._offset += 1
    this.flvHeader['Headersize'] = {
      value: this.buffer.readUIntBE(this._offset, 4).toString(10),
      offset: this._offset,
      origin: this.buffer.slice(this._offset, this._offset + 4)
    }
    this._offset += 4
  }
  getTags() {
    let previousTag = null
    while (true) {
      let nextType = this.getNextTagType()
      let tag
      if (nextType === 'unknow') {
        tag = new Tag(this.buffer, this._offset)
        if (tag.isBad) {
          break
        }
      } else if (nextType === 'audio') {
        tag = new AudioTag(this.buffer, this._offset)
        if (tag.isBad) {
          break
        }
        this.audioTags.push(tag)
      } else if (nextType === 'video') {
        tag = new VideoTag(this.buffer, this._offset)
        if (tag.isBad) {
          break
        }
        this.videoTags.push(tag)
      } else if (nextType === 'script') {
        tag = new ScriptTag(this.buffer, this._offset)
        if (tag.isBad) {
          break
        }
        this.scriptTags.push(tag)
      } else if (nextType === 'unknow') {
        if (tag.isBad) {
          break
        }
      }
      this._offset += tag.length
      tag.previousTag = previousTag
      this.tags.push(tag)
      previousTag = tag
    }
  }
  getNextTagType() {
    if (this._offset + 5 > this.buffer.length) return 'unknow'
    let type = Number(this.buffer.readUIntBE(this._offset + 4, 1).toString(10))
    switch (type) {
      case 8:
        return 'audio';
      case 9:
        return 'video';
      case 18:
        return 'script';
      default:
        return 'unknow'
    }
  }
  fixTimestamp() {
    this.fixVideoTimestamp()
    this.fixAudioTimestamp()
  }
  fixVideoTimestamp() {
    let firstTag  //第一个tag的时间戳一定是0
    let baseTimestamp = 0 //上一个未修复是时间戳
    let previousTimestamp = 0 // 上一个已被修复的时间戳
    let previousTimestampDiff = 0 // 上一个时间戳差
    let onece = true
    for (let videoTag of this.videoTags) {
      if (!firstTag) {
        firstTag = videoTag
        continue
      }
      if (videoTag.getTimestamp() === 0) {
        continue
      }
      let newTimestampDiff = videoTag.getTimestamp() - baseTimestamp
      if (newTimestampDiff < 0) {//当上一个原始时间戳比当前原始时间戳更大
        newTimestampDiff = previousTimestampDiff
      } else {
        previousTimestampDiff = newTimestampDiff
      }

      if (onece && newTimestampDiff > 100) {
        //仅在第二个帧是非顺序时间戳的时候进入
        onece = false
        newTimestampDiff = this.videoTags[this.videoTags.indexOf(videoTag) + 1].getTimestamp() - videoTag.getTimestamp()
      }
      baseTimestamp = videoTag.getTimestamp()
      videoTag.setTimestamp(previousTimestamp + newTimestampDiff)
      previousTimestamp = videoTag.getTimestamp()
    }
  }
  fixAudioTimestamp() {
    let firstTag  //第一个tag的时间戳一定是0
    let baseTimestamp = 0 //上一个未修复是时间戳
    let previousTimestamp = 0 // 上一个已被修复的时间戳
    let previousTimestampDiff = 0 // 上一个时间戳差
    let onece = true
    for (let audioTag of this.audioTags) {
      if (!firstTag) {
        firstTag = audioTag
        continue
      }
      if (audioTag.getTimestamp() === 0) {
        continue
      }
      let newTimestampDiff = audioTag.getTimestamp() - baseTimestamp
      if (newTimestampDiff < 0) {//当上一个原始时间戳比当前原始时间戳更大
        newTimestampDiff = previousTimestampDiff
      } else {
        previousTimestampDiff = newTimestampDiff
      }

      if (onece && newTimestampDiff > 100) {
        //仅在第二个帧是非顺序时间戳的时候进入
        onece = false
        newTimestampDiff = this.audioTags[this.audioTags.indexOf(audioTag) + 1].getTimestamp() - audioTag.getTimestamp()
      }
      baseTimestamp = audioTag.getTimestamp()
      audioTag.setTimestamp(previousTimestamp + newTimestampDiff)
      previousTimestamp = audioTag.getTimestamp()
    }
  }
  fixDuration() {
    let framerate = this.scriptTags[0].getFramerate()
    // if(!framerate){
    //   //根据前两个非0视频帧时间戳估计
    //   let first = this.videoTags[1].getTimestamp()
    //   let second = this.videoTags[2].getTimestamp()
    //   framerate = 30
    // }
    Logger.notice(`控制帧指定的帧率: ${framerate}/s`)
    switch (framerate) {
      case 60:
        // Logger.notice(`控制帧指定的帧率: ${framerate}/s`)
        break
      case 30:
        // Logger.notice(`控制帧指定的帧率: ${framerate}/s`)
        break
      default:
        framerate = 30
        Logger.notice(`非正常帧率，使用默认帧率: ${framerate}/s`)
    }
    let DurationFromCurrentMaxTimestamp = this.videoTags[this.videoTags.length - 1].getTimestamp() / 1000
    let Duration = Math.max(DurationFromCurrentMaxTimestamp, this.videoTags.length / framerate)
    let { needUpdate } = this.scriptTags[0].setDuration(Duration)

    Logger.notice(`总帧数: ${this.videoTags.length}`)
    Logger.notice(`视频长度: ${parseInt(Duration / 60)} min`)
    // Logger.debug(`最大修复时间戳: ${this.videoTags[this.videoTags.length - 1].getTimestamp()}`)
    // if(needUpdate){
    //   this.updateInfo()
    // }
  }
  static binaryFill(str, sum) {//补全二进制缺的位数
    let newstr = str
    for (let i = 0; i < sum - str.length; i++) {
      newstr = '0' + newstr
    }
    return newstr
  }
}

module.exports = FLVprocessor