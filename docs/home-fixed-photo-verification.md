# 首页固定照片窗口验证

- 2026-10-31：移除 PhotoMarquee 双列自动滚动，首页只读取 hero-polaroid 图片位，缺省或加载失败时回退既有插画。
- npm run build 通过；既有 docs/images 图片路径解析警告及超过 500 kB 分包警告仍存在。
- 桌面 1440×900：相框 490.5×576，间隔读取位置均为 x=819.5、y=162.5，animation=none，mask=none，图片 object-fit=cover。保留现有桌面位置（文字右侧）。
- 手机 390×844：相框 350×380，无横向溢出，位于文字下方；首屏下部需通过章节内滚动查看，已实测可完整访问。
- 浏览器预览实际显示未配置主图的占位状态。已配置 URL 与加载失败回退通过实际 Home 组件转译后注入状态并调用错误处理验证；未修改后台数据，不能视为后台真实配置测试。
- 桌面项目章节切换及返回正常。旧滚动关键帧、批量预加载与监听已删除。
- 截图：verification/home-fixed-desktop.jpg、verification/home-fixed-mobile.jpg、verification/home-fixed-mobile-scrolled.jpg。
- 本地预览 http://127.0.0.1:5174/ 。未发布、未提交 Git。

## 黑色占位调整

按后续要求，首页主图缺失或加载失败时改为纯黑相框，不再使用插画。失败后移除 img，保留相框尺寸、圆角、边框及“照片待添加”无障碍标签；主图 URL 变化后可重新加载。其他区域的插画回退保留。npm run build 与 git diff --check 通过。浏览器实测缺图状态 background=rgb(0,0,0)、img 数量=0。截图 verification/home-black-placeholder.jpg。
