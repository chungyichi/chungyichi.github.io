---
title: How this blog works
summary: Write Markdown, commit, push, and that publishes. This post explains the writing flow and the build.
---
This site is static: posts are Markdown files that are turned into plain HTML at build time. There is no tracking, and no JavaScript is needed to read it.

## Writing a post

```sh
npm run new "Post title"
```

This creates `YYYY-MM-DD-slug.en.md` in `content/posts/`. For a Chinese version, create a `.zh.md` with the same slug; the two files are linked as translations automatically.

## Publishing

A post with `draft: true`, or dated in the future, is not published. When it is ready:

```sh
npm run check
git add -A && git commit -m "Add a post" && git push
```

After a push to `main`, the site is built and updated automatically.
