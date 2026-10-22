# Design Update

GitHub Pages 静态发布版。网站内容、代码和图片来源链接会随仓库公开。

## 上传与启用

1. 打开 GitHub 仓库 design-update，点击 uploading an existing file（已有文件时 Add file → Upload files）。
2. 将本文件夹【里面的所有文件及 issues 文件夹】拖入，不要拖外面的“GitHub发布版”文件夹，也不要上传 zip。
3. 确认第一层可看到 index.html，点击 Commit changes。
4. Settings → Pages → Deploy from a branch → main → /(root) → Save。
5. GitHub 显示发布成功后，访问 https://b1045065019-blip.github.io/design-update/ 。

.nojekyll 是隐藏空文件。网页拖入时如未包含它，也不影响本版本的普通 HTML/CSS/JS；支持显示隐藏文件时可一起上传。

## 功能

在线阅读、筛选、搜索、往期浏览和已整理作品图预览均为静态功能。
在线版不会请求本地 Eagle API，不会调用 Python 图片提取接口。
“打开本机版收录”仅打开当前电脑的 http://127.0.0.1:8765/；需本机服务运行并安装 Eagle，手机无法连接电脑的本机地址。

## 后续更新

托管不会自动生成简报。三日简报在原本电脑上生成，随后由本聊天通过已授权 GitHub 连接同步到本仓库。机器离线或授权失效时会报告失败。图片补充与预设分类也需同步导出，在线版本身不会抓取文章。

本包不包含本机日志、缓存、备份、Python 服务、临时预览页或 Eagle 资源库文件。
