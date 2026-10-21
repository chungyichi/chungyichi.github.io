---
title: 這個部落格怎麼運作
summary: 用 Markdown 寫文章，commit 加 push 就是發佈；這篇說明寫作流程與建置方式。
---
這個網站是靜態網站：文章是 Markdown 檔，建置時轉成純 HTML，沒有追蹤，也不需要 JavaScript 才能閱讀。

## 寫一篇文章

```sh
npm run new "文章標題"
```

指令會在 `content/posts/` 建立 `YYYY-MM-DD-slug.zh.md`。想要英文版，就再建立同一個 slug 的 `.en.md`，兩個檔案會自動互為翻譯。

## 發佈

`draft: true` 的文章，或日期在未來的文章，不會被發佈。準備好之後：

```sh
npm run check
git add -A && git commit -m "Add a post" && git push
```

push 到 `main` 之後，網站會自動建置並更新。
