# B站录播姬纯命令行版

- [x] 监听直播间开播自动开始录制
- [x] 多个直播间同时录制
- [x] 修复时间戳
- [ ] 分段合并

## !!!!项目使用了NodeJs v10.5.0的多线程特性，所以node版本需要10.5.0以上

## 特点
- 纯js编写FLV解析器，无需依赖ffmpeg

## 一、使用

### 1、下载依赖

```bash
npm i
```
或

```bash
cnpm i
```

不过也才3个依赖npm也不会多慢

### 2、配置文件

```javascript
module.exports = {
  save: "./output/", //处理后的视频存放目录
  tmp: "./output/tmp/", // 未处理的临时存放目录
  deleteTmp: false, // 自动删除临时文件 不建议打开，建议手动清除
  debug: false,
  RoomList: [
    {
      nickname: '白上吹雪',// 不填则默认以roomid作为nickname
      roomid: 11588230 // 必须，可以是短房间号
    },
    {
      nickname: '夏色祭',
      roomid: 13946381
    }
  ]
}
```

### 3、运行
```bash
npm start
```

或者
```bash
node --experimental-worker index.js
```

## 二、感谢

[FLV格式解析](http://gavinxyj.com/2017/03/11/flvFormat/)

[B站录播姬](https://github.com/Bililive/BililiveRecorder)

[Bilibili-Live-API](https://github.com/lovelyyoshino/Bilibili-Live-API)

[js-bilibili-live-websocket](https://github.com/ganlvtech/js-bilibili-live-websocket-demo)

## 三、附录

[FLV标准](https://wwwimages2.adobe.com/content/dam/acom/en/devnet/flv/video_file_format_spec_v10.pdf)

## 四、注意

录像自己看就好，不要未经主播同意擅自发布

## 五、OpenSource License

![Files](https://www.gnu.org/graphics/gplv3-127x51.png)

All source code files are licensed under [GNU General Public License v3 (GPLv3)](https://www.gnu.org/licenses/quick-guide-gplv3.en.html).  