# 团建游戏：扫码分发词语 Web 版

这是一个非常精简的网页版版本：**只负责创建房间、扫码加入、秘密分发词语**。

## 流程

1. 房主打开网页并创建房间。
2. 网页显示二维码。
3. 其他玩家用手机扫码进入。
4. 每个人输入自己的昵称。
5. 房主点击“开始分发词语”。
6. 系统随机给每个人分配 2 个词语。
7. 每个人的手机只显示自己的词语。
8. 之后的回答、猜身份、投票等全部在线下进行。

## 技术

Node.js + Express + Socket.IO + QRCode。

## 本地运行

需要 Node.js 18+：

```bash
npm install
npm start
```

打开：

http://localhost:3000

如果电脑和手机连接同一个 Wi-Fi，可以让手机访问电脑局域网 IP，例如：

http://192.168.1.100:3000

也可以设置：

```bash
PUBLIC_URL=http://192.168.1.100:3000 npm start
```

## 正式使用

部署到支持 Node.js 和 WebSocket 的服务器，并设置：

```text
PUBLIC_URL=https://你的域名
```

然后所有人扫码进入即可。

## 下一步

可以继续增加：
- 房主自己上传/编辑词库
- 词语配对
- 指定“相同词/不同词”
- 伪人模式的特殊发牌规则
- 防止重复词语
- 每轮重新洗牌
- 游戏结束后自动清空房间


## GitHub / Render deployment

This project is ready to upload directly to a GitHub repository.
Upload the contents of this folder so that `package.json` and `server.js`
are in the repository root.

Start command:

```bash
npm start
```

The app listens on the port provided by the `PORT` environment variable.
