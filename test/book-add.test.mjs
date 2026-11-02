import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { planBooks } from "../scripts/book-add.mjs";
import { parsePost } from "../scripts/content.mjs";

const row = (...c) => c.join("\t");
const DATE = "2026-11-02";

test("book-add: a full line becomes a book that the build parses back, colons and quotes included", () => {
  const { write, skipped } = planBooks(row('Title: "Quoted", part 1', "薩爾瓦多", "son", "奇幻, 小說", "A: summary", "第一部; 第二部, 上", "no", "https://example.com/n", "dark-elf") + "\n", { date: DATE });
  assert.deepEqual(skipped, []);
  assert.equal(write[0].file, `${DATE}-dark-elf.zh.md`);
  const p = parsePost(write[0].file, write[0].text, undefined, "books");
  assert.deepEqual([p.title, p.owner, p.tags, p.summary, p.volumes, p.own, p.source, p.draft], ['Title: "Quoted", part 1', "son", ["奇幻", "小說"], "A: summary", ["第一部", "第二部, 上"], false, "https://example.com/n", false]);
  assert.equal(p.author, "R．A．薩爾瓦多");                                  // the alias is rewritten to the one spelling
});

test("book-add: defaults, a single volume with a comma, blank and comment lines", () => {
  const { write, skipped } = planBooks(`title\tauthor\n# note\n\n${row("書", "全民熙", "", "小說", "", "上, 下", "", "", "book-a")}\n`, { date: DATE });
  assert.deepEqual(skipped, []);
  const p = parsePost(write[0].file, write[0].text, undefined, "books");
  assert.deepEqual([p.owner, p.own, p.volumes, p.summary, p.source], ["me", true, ["上, 下"], "全民熙", ""]);   // no summary: the author line stands in
});

test("book-add: bad lines are skipped with a reason, good ones are still written; taken and repeated slugs are refused", () => {
  const text = [row("A", "", "", "x", "S", "", "", "", "a"), row("", "", "", "x", "S", "", "", "", "b"), row("C", "", "", "x", "S", "", "", "", "Bad Slug"), row("D", "", "", "", "S", "", "", "", "d"),
    row("E", "", "daughter", "x", "S", "", "", "", "e"), row("F", "", "", "x", "S", "", "maybe", "", "f"), row("G", "", "", "x", "S", "", "", "", "a"), row("H", "", "", "x", "S", "", "", "", "taken"),
    row("I", "", "", "x", "S", "", "", "ftp://x", "i")].join("\n");
  const { write, skipped } = planBooks(text, { date: DATE, taken: (s) => s === "taken" });
  assert.deepEqual(write.map((w) => w.file), [`${DATE}-a.zh.md`]);
  assert.deepEqual(skipped.map((s) => s.line), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.match(skipped[0].reason, /no title/);
  assert.match(skipped[2].reason, /no tags/);
  assert.match(skipped[3].reason, /owner "daughter"/);
  assert.match(skipped[4].reason, /own "maybe"/);
  assert.match(skipped[5].reason, /used twice/);
  assert.match(skipped[6].reason, /already exists/);
});

test("book-add: an unknown author is not written and is listed once with its books", () => {
  const { write, skipped, unknownAuthors } = planBooks([row("One", "Nobody Known", "", "x", "S", "", "", "", "one"), row("Two", "Nobody Known", "", "x", "S", "", "", "", "two"), row("Three", "全民熙", "", "x", "S", "", "", "", "three")].join("\n"), { date: DATE });
  assert.deepEqual(write.map((w) => w.file), [`${DATE}-three.zh.md`]);
  assert.equal(skipped.length, 2);
  assert.deepEqual([...unknownAuthors.keys()], ["Nobody Known"]);
  assert.deepEqual(unknownAuthors.get("Nobody Known").titles, ["One", "Two"]);
});

test("book-add: an adult own-no book with a source is refused (text only)", () => {
  const { write, skipped } = planBooks(row("X", "", "", "成人", "S", "", "no", "https://example.com/x", "x"), { date: DATE });
  assert.equal(write.length, 0);
  assert.match(skipped[0].reason, /adult/);
});

test("book-add command: writes into --out, never overwrites, and prints the summary", () => {
  const dir = mkdtempSync(join(tmpdir(), "book-add-")), out = join(dir, "books"), list = join(dir, "list.tsv");
  writeFileSync(list, row("甲", "", "me", "小說", "S", "", "", "", "jia") + "\n" + row("乙", "Stranger", "", "x", "S", "", "", "", "yi") + "\n");
  const run = () => spawnSync("node", ["scripts/book-add.mjs", list, "--out", out, "--date", DATE], { encoding: "utf8" });
  const first = run();
  assert.match(first.stdout, /written 1, skipped 1/);
  assert.match(first.stdout, /Stranger/);
  assert.deepEqual(readdirSync(out), [`${DATE}-jia.zh.md`]);
  const before = readFileSync(join(out, `${DATE}-jia.zh.md`), "utf8");
  const second = run();
  assert.match(second.stdout, /written 0, skipped 2/);
  assert.match(second.stdout, /already exists/);
  assert.equal(readFileSync(join(out, `${DATE}-jia.zh.md`), "utf8"), before);
});

test("book-add: the optional 10th column original is written and read back", () => {
  const { write, skipped } = planBooks(row("題", "", "", "x", "S", "", "", "", "orig", "원제 / English Title"), { date: DATE });
  assert.deepEqual(skipped, []);
  assert.equal(parsePost(write[0].file, write[0].text, undefined, "books").original, "원제 / English Title");
});

test("book-add: the optional 11th column type 漫畫 is written; another value is skipped", () => {
  const ok = planBooks(row("漫", "", "", "x", "S", "", "", "", "manga", "", "漫畫"), { date: DATE });
  assert.equal(parsePost(ok.write[0].file, ok.write[0].text, undefined, "books").type, "comic");
  const bad = planBooks(row("雜", "", "", "x", "S", "", "", "", "mag", "", "雜誌"), { date: DATE });
  assert.match(bad.skipped[0].reason, /'type' must be one of/);
});
