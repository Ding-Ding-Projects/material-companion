import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/text-button.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/slider/slider.js";
import "@material/web/switch/switch.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import { marked } from "marked";
import DOMPurify from "dompurify";
import data from "./generated/content.json";
import {
  loadPreferences,
  defaults,
  storeKey,
  safeRegex,
  type Preferences,
} from "./preferences";
import "./style.css";
const routes = [
  ["home", "Overview", "總覽"],
  ["docs", "Documentation", "說明文件"],
  ["wiki", "Wiki", "知識庫"],
  ["settings", "Preferences", "偏好設定"],
  ["privacy", "Privacy", "私隱"],
  ["status", "Current verdicts", "目前驗證狀態"],
];
const escapePattern = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
class CompanionDocs extends LitElement {
  static properties = {
    route: { state: true },
    prefs: { state: true },
    query: { state: true },
    regex: { state: true },
    flags: { state: true },
    builder: { state: true },
    error: { state: true },
    message: { state: true },
    settingQuery: { state: true },
  };
  route = location.hash.slice(1) || "home";
  prefs = loadPreferences();
  query = "";
  regex = false;
  flags = "i";
  builder = false;
  error = "";
  message = "";
  settingQuery = "";
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("hashchange", this.routeChanged);
    window.addEventListener("storage", this.storageChanged);
    this.apply();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this.routeChanged);
    window.removeEventListener("storage", this.storageChanged);
  }
  routeChanged = () => {
    this.route = location.hash.slice(1) || "home";
    this.error = "";
    this.requestUpdate();
    this.updateComplete.then(() => {
      const anchor = this.route.split("@")[1];
      const target = anchor
        ? document.getElementById(anchor)
        : document.querySelector("main");
      (target as HTMLElement)?.focus({ preventScroll: true });
      if (anchor) target?.scrollIntoView({ block: "start" });
      else window.scrollTo(0, 0);
    });
  };
  storageChanged = () => {
    this.prefs = loadPreferences();
    this.apply();
  };
  apply() {
    document.documentElement.lang =
      this.prefs.language === "yue" ? "yue-Hant-HK" : "en";
    document.documentElement.classList.toggle(
      "dark",
      this.prefs.theme === "dark",
    );
    document.body.classList.toggle("reduce-motion", this.prefs.reducedMotion);
  }
  t(en: string, yue: string) {
    return this.prefs.language === "yue"
      ? yue
      : this.prefs.language === "bilingual"
        ? html`<span class="bilingual"
            >${en}<small lang="yue-Hant-HK">${yue}</small></span
          >`
        : en;
  }
  save<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    this.prefs = { ...this.prefs, [key]: value };
    try {
      localStorage.setItem(storeKey, JSON.stringify(this.prefs));
      this.message = this.copy("saved");
    } catch {
      this.message = this.tText(
        "Storage unavailable. Changes apply only until this page closes.",
        "儲存空間不可用；設定只維持至關閉頁面。",
      );
    }
    this.apply();
  }
  tText(en: string, yue: string) {
    return this.prefs.language === "yue"
      ? yue
      : this.prefs.language === "bilingual"
        ? en + " / " + yue
        : en;
  }
  copy(kind: string) {
    const n =
      this.prefs.language === "yue"
        ? this.prefs.cantoneseFunny
        : this.prefs.englishFunny;
    const en = [
      "Preferences saved.",
      "Preferences saved. Ready for the next page.",
      "Preferences saved. The page remembered.",
      "Preferences saved. One less thing to repeat.",
      "Preferences saved. The page finally took notes.",
    ][n - 1];
    const yue = [
      "偏好設定已儲存。",
      "偏好設定已儲存，可以繼續閱讀。",
      "偏好設定已儲存，頁面記住了。",
      "偏好設定已儲存，不用再講一次。",
      "偏好設定已儲存，頁面終於識做筆記。",
    ][n - 1];
    return (
      (this.prefs.emojis ? "✓ " : "") +
      this.tText(
        kind === "saved" ? en : "Preferences reset.",
        kind === "saved" ? yue : "偏好設定已重設。",
      )
    );
  }
  link(id: string, title: string, detail: string) {
    return html`<a class="list-row" href=${"#" + id}
      ><span><strong>${title}</strong><small>${detail}</small></span
      ><span aria-hidden="true">→</span></a
    >`;
  }
  boundary() {
    return html`<div class="boundary" role="note">
      ${this.t(
        "This is documentation and project status. Reading needs no extension. Native actions require the installed companion, an enabled integration and explicit authorization.",
        "這是說明文件及專案狀態。閱讀毋須擴充功能；原生操作需要已安裝的配套程式、已啟用的整合及明確授權。",
      )}
    </div>`;
  }
  search() {
    return html`<div class="search">
        <md-outlined-text-field
          type="search"
          label=${this.tText(
            "Search complete documentation",
            "搜尋完整說明文件",
          )}
          .value=${this.query}
          @input=${(e: Event) => {
            this.query = (e.target as HTMLInputElement).value;
            this.error = "";
          }}
        ></md-outlined-text-field
        ><md-text-button
          @click=${() => {
            this.query = "";
            this.error = "";
          }}
          >${this.t("Clear", "清除")}</md-text-button
        ><md-outlined-button
          @click=${() => (this.builder = !this.builder)}
          aria-expanded=${this.builder}
          >${this.t("Regex builder", "正規表示式工具")}</md-outlined-button
        >
      </div>
      ${this.builder
        ? html`<section
            class="setting"
            aria-label=${this.tText(
              "Regular expression builder",
              "正規表示式工具",
            )}
          >
            <label
              ><md-switch
                aria-label=${this.tText(
                  "Use regular expression",
                  "使用正規表示式",
                )}
                .selected=${this.regex}
                @change=${(e: Event) =>
                  (this.regex = (
                    e.target as unknown as { selected: boolean }
                  ).selected)}
              ></md-switch
              >${this.t("Use regular expression", "使用正規表示式")}</label
            >
            <div class="actions">
              <md-outlined-button
                @click=${() => {
                  this.query = escapePattern(this.query);
                  this.regex = true;
                }}
                >${this.t(
                  "Escape literal text",
                  "將文字轉為字面模式",
                )}</md-outlined-button
              ><md-outlined-button
                @click=${() => {
                  this.query = "^" + this.query + "$";
                  this.regex = true;
                }}
                >${this.t(
                  "Match whole text",
                  "比對整段文字",
                )}</md-outlined-button
              ><md-outlined-button
                @click=${() => {
                  this.query = "(?:" + this.query + ")";
                  this.regex = true;
                }}
                >${this.t("Group expression", "群組表示式")}</md-outlined-button
              ><md-outlined-button
                @click=${() => {
                  this.flags = this.flags === "i" ? "" : "i";
                }}
                >${this.t(
                  this.flags ? "Case insensitive" : "Case sensitive",
                  this.flags ? "不分大小寫" : "區分大小寫",
                )}</md-outlined-button
              >
            </div>
            <p>
              ${this.t(
                "Patterns are bounded to 256 characters. Nested repetition and backreferences are rejected to reduce expensive matching. Search stays on this device.",
                "模式上限為 256 字元。拒絕巢狀重複及反向參照，減少昂貴比對；搜尋只在本機進行。",
              )}
            </p>
          </section>`
        : nothing}`;
  }
  filtered() {
    if (!this.query) return data.articles;
    try {
      const re = this.regex ? safeRegex(this.query, this.flags) : null;
      this.error = "";
      return data.articles.filter((a) => {
        const text = a.title + "\n" + a.markdown;
        return re
          ? re.test(text)
          : text.toLocaleLowerCase().includes(this.query.toLocaleLowerCase());
      });
    } catch (e) {
      this.error = this.tText(
        "Invalid or unsupported regular expression. Change the pattern; no search was run.",
        "正規表示式無效或不支援。請修改模式；搜尋尚未執行。",
      );
      return [];
    }
  }
  article(id: string) {
    const a = data.articles.find((a) => a.id === id);
    if (!a)
      return html`<h1>${this.t("Article unavailable", "文章不可用")}</h1>
        <p>
          ${this.t(
            "This route does not match a checked-in article.",
            "此路徑沒有對應的已登記文章。",
          )}
        </p>
        <a href="#docs">${this.t("Documentation index", "說明文件索引")}</a>`;
    let parsed = marked.parse(a.markdown, { async: false }) as string;
    parsed = parsed.replace(
      /href="([^"#][^"]*\.md)(#[^"]*)?"/g,
      (_, target: string, anchor: string = "") => {
        if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(target))
          return `href="${target}${anchor}"`;
        const parts = a.source.split("/");
        parts.pop();
        for (const piece of target.split("/"))
          if (piece === "..") parts.pop();
          else if (piece !== ".") parts.push(piece);
        const destination = parts.join("/").replace(/\.md$/, "");
        return `href="#article/${destination}${anchor ? "@" + anchor.slice(1) : ""}"`;
      },
    );
    parsed = parsed.replace(
      /href="#(?!article\/)([^"]+)"/g,
      (_, anchor: string) => `href="#article/${a.id}@${anchor}"`,
    );
    parsed = parsed.replace(
      /<h([1-6])>(.*?)<\/h\1>/g,
      (_, level: string, title: string) =>
        `<h${level} id="${title
          .replace(/<[^>]+>/g, "")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .trim()
          .replace(/\s+/g, "-")}" tabindex="-1">${title}</h${level}>`,
    );
    const clean = DOMPurify.sanitize(parsed, {
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["style"],
    });
    return html`<p class="provenance">
        ${this.t("Complete source article", "完整來源文章")}:
        <code>${a.source}</code>
      </p>
      <p class="notice">
        ${this.t(
          "Article source language is preserved. Cantonese article translations remain an explicit acceptance gap.",
          "保留文章來源語言。粵語文章翻譯仍是待完成的驗收項目。",
        )}
      </p>
      <article class="article">${unsafeHTML(clean)}</article>
      <h2>${this.t("Related reading", "相關閱讀")}</h2>
      <div class="list">
        ${data.articles
          .filter((b) => b.category === a.category && b.id !== a.id)
          .map((b) => this.link("article/" + b.id, b.title, b.source))}
      </div>`;
  }
  settings() {
    const groups = [
      { id: "language", en: "Language and voice", yue: "語言及語氣" },
      { id: "appearance", en: "Appearance", yue: "外觀" },
      { id: "privacy", en: "Local data", yue: "本機資料" },
    ];
    return html`<h1>${this.t("Preferences", "偏好設定")}</h1>
      <md-outlined-text-field
        type="search"
        label=${this.tText("Search preferences", "搜尋偏好設定")}
        .value=${this.settingQuery}
        @input=${(e: Event) =>
          (this.settingQuery = (e.target as HTMLInputElement).value)}
      ></md-outlined-text-field
      >${groups
        .filter((g) =>
          (g.en + g.yue)
            .toLowerCase()
            .includes(this.settingQuery.toLowerCase()),
        )
        .map(
          (g) =>
            html`<section class="setting">
              <h2>${this.t(g.en, g.yue)}</h2>
              ${g.id === "language"
                ? html`<md-outlined-select
                      label=${this.tText("Language", "語言")}
                      .value=${this.prefs.language}
                      @change=${(e: Event) =>
                        this.save(
                          "language",
                          (e.target as HTMLSelectElement)
                            .value as Preferences["language"],
                        )}
                      >${[
                        ["en", "English"],
                        ["yue", "香港粵語"],
                        ["bilingual", "English + 香港粵語"],
                      ].map(
                        ([v, l]) =>
                          html`<md-select-option value=${v}
                            ><div slot="headline">${l}</div></md-select-option
                          >`,
                      )}</md-outlined-select
                    >${(["englishFunny", "cantoneseFunny"] as const).map(
                      (key, i) =>
                        html`<label class="slider-label"
                            >${this.t(
                              i
                                ? "Cantonese funny level"
                                : "English funny level",
                              i ? "粵語趣味程度" : "英語趣味程度",
                            )}:
                            ${this.prefs[key]}<md-slider
                              min="1"
                              max="5"
                              step="1"
                              ticks
                              labeled
                              .value=${this.prefs[key]}
                              aria-label=${this.tText(i ? "Cantonese funny level" : "English funny level", i ? "粵語趣味程度" : "英語趣味程度")}
                              @change=${(e: Event) =>
                                this.save(
                                  key,
                                  Number((e.target as HTMLInputElement).value),
                                )}
                            ></md-slider></label
                          ><md-text-button @click=${() => this.save(key, 5)}
                            >${this.t(
                              "Reset this level",
                              "重設此程度",
                            )}</md-text-button
                          >`,
                    )}
                    <p>
                      ${this.t(
                        "Levels change preference confirmation copy. Level 1 is serious, level 5 is playful. Wider message-category localization remains incomplete.",
                        "程度會改變偏好確認文字。1 為認真，5 為活潑；其他訊息類別的本地化尚未完成。",
                      )}
                    </p>
                    <label
                      ><md-switch
                        aria-label=${this.tText(
                          "Show symbols in messages",
                          "訊息顯示符號",
                        )}
                        .selected=${this.prefs.emojis}
                        @change=${(e: Event) =>
                          this.save(
                            "emojis",
                            (e.target as unknown as { selected: boolean })
                              .selected,
                          )}
                      ></md-switch
                      >${this.t(
                        "Show symbols in messages",
                        "訊息顯示符號",
                      )}</label
                    >`
                : g.id === "appearance"
                  ? html`<md-outlined-button
                        @click=${() =>
                          this.save(
                            "theme",
                            this.prefs.theme === "light" ? "dark" : "light",
                          )}
                        >${this.t(
                          this.prefs.theme === "light"
                            ? "Switch to dark theme"
                            : "Switch to light theme",
                          this.prefs.theme === "light"
                            ? "切換深色主題"
                            : "切換淺色主題",
                        )}</md-outlined-button
                      ><label
                        ><md-switch
                          aria-label=${this.tText(
                            "Reduce motion",
                            "減少動態效果",
                          )}
                          .selected=${this.prefs.reducedMotion}
                          @change=${(e: Event) =>
                            this.save(
                              "reducedMotion",
                              (e.target as unknown as { selected: boolean })
                                .selected,
                            )}
                        ></md-switch
                        >${this.t("Reduce motion", "減少動態效果")}</label
                      >`
                  : html`<h3>
                        ${this.t("Personal wording JSON", "個人用語 JSON")}
                      </h3>
                      <p>
                        ${this.t(
                          "No file loaded. Import is unavailable: this public static website has no authenticated private presentation boundary. A file or checkbox cannot authenticate a visitor. Original wording remains active.",
                          "尚未載入檔案。無法匯入：此公開靜態網站沒有已驗證的私人顯示界線。檔案或核取方塊不能驗證訪客；維持原有用語。",
                        )}
                      </p>
                      <md-outlined-button disabled
                        >${this.t(
                          "Choose local JSON file",
                          "選擇本機 JSON 檔案",
                        )}</md-outlined-button
                      ><md-outlined-button
                        @click=${() => {
                          localStorage.removeItem(storeKey);
                          this.prefs = { ...defaults };
                          this.apply();
                          this.message = this.copy("reset");
                        }}
                        >${this.t(
                          "Reset website preferences",
                          "重設網站偏好",
                        )}</md-outlined-button
                      >`}
            </section>`,
        )}`;
  }
  page() {
    const route = this.route.split("@")[0];
    if (route.startsWith("article/")) return this.article(route.slice(8));
    if (route.startsWith("category/")) {
      const category = route.slice(9);
      return html`<h1>${category}</h1>
        <div class="list">
          ${data.articles
            .filter((a) => a.category === category)
            .map((a) => this.link("article/" + a.id, a.title, a.source))}
        </div>`;
    }
    switch (route) {
      case "docs": {
        const found = this.filtered();
        return html`<h1>${this.t("Documentation", "說明文件")}</h1>
          ${this.search()}${this.error
            ? html`<p role="alert">${this.error}</p>`
            : nothing}
          <p>
            ${found.length}
            ${this.t("complete articles in this build", "篇完整文章於此版本")}
          </p>
          <div class="categories">
            ${[...new Set(data.articles.map((a) => a.category))].map(
              (c) => html`<a href=${"#category/" + c}>${c}</a>`,
            )}
          </div>
          <div class="list">
            ${found.map((a) => this.link("article/" + a.id, a.title, a.source))}
          </div>
          ${!found.length && !this.error
            ? html`<p role="status">
                ${this.t(
                  "No matching articles. Clear or change the search.",
                  "沒有符合的文章。請清除或修改搜尋。",
                )}
              </p>`
            : nothing}`;
      }
      case "settings":
        return this.settings();
      case "wiki":
        return html`<h1>${this.t("Wiki", "知識庫")}</h1>
          <div class="notice">
            ${this.t(
              "Wiki source unavailable. The enabled wiki returned repository-not-found during inspection. It may be uninitialized or inaccessible; completeness remains unresolved.",
              "知識庫來源不可用。已啟用的知識庫在檢查時回報找不到儲存庫，可能尚未初始化或無法存取；完整性仍未確認。",
            )}
          </div>
          <a href="#docs"
            >${this.t(
              "Read checked-in documentation",
              "閱讀已登記的說明文件",
            )}</a
          >`;
      case "privacy":
        return html`<h1>
            ${this.t("Privacy and local boundaries", "私隱及本機界線")}
          </h1>
          ${this.boundary()}
          <h2>${this.t("What this website stores", "網站儲存甚麼")}</h2>
          <p>
            ${this.t(
              "Language, theme, two funny levels, message symbols and reduced motion are stored in this origin’s local storage. Search terms stay in memory. No analytics, remote font, account sign-in, private file import or native execution occurs. Reset in Preferences removes the website preference record.",
              "語言、主題、兩個趣味程度、訊息符號及減少動態設定儲存於此來源的本機儲存空間。搜尋詞只留在記憶體；沒有分析、遠端字體、登入、私人檔案匯入或原生執行。偏好設定的重設可移除網站紀錄。",
            )}
          </p>
          <h2>${this.t("Optional desktop connection", "可選桌面連線")}</h2>
          <p>
            ${this.t(
              "The installed extension may provide a trusted scoped bridge in a later verified integration. This website does not currently probe for or send page messages to the extension. Connection state: not detected, no handshake attempted. Reading and preferences work independently.",
              "已安裝的擴充功能可在日後經驗證的整合提供受信任及有範圍限制的橋接。此網站目前不探測或發送頁面訊息。連線狀態：未偵測，尚未嘗試交握。閱讀及偏好設定可獨立使用。",
            )}
          </p>`;
      case "status":
        return html`<h1>${this.t("Current verdicts", "目前驗證狀態")}</h1>
          <div class="notice">
            ${this.t(
              "Implementation, runtime verification, visual coverage and delivery are separate verdicts. No release or installer download is offered.",
              "實作、執行驗證、視覺覆蓋及交付是分開的結果。沒有提供發行或安裝程式下載。",
            )}
          </div>
          <dl>
            <dt>${this.t("Source", "來源")}</dt>
            <dd><code>${data.source}</code></dd>
            <dt>${this.t("Documentation inventory", "說明文件清單")}</dt>
            <dd>${data.articles.length} ${this.t("complete checked-in articles", "篇完整已登記文章")}</dd>
            <dt>${this.t("Wiki", "知識庫")}</dt>
            <dd>${this.t(data.wiki.reason, "儲存庫已啟用知識庫，但檢查交付時，其 Git 來源回報找不到儲存庫。可能尚未初始化或無法存取，並不代表知識庫為空。")}</dd>
            <dt>${this.t("Production visual matrix", "正式版本視覺驗證矩陣")}</dt>
            <dd>${this.t("Unverified", "尚未驗證")}</dd>
            <dt>${this.t("Hosted delivery and homepage", "託管交付及首頁")}</dt>
            <dd>${this.t("Unverified by this build", "此版本尚未驗證")}</dd>
            <dt>${this.t("Optional pairing", "可選配對")}</dt>
            <dd>${this.t("Not detected; trusted bridge acceptance pending", "尚未偵測；受信任橋接仍待驗收")}</dd>
          </dl>
          <p>
            ${this.t(
              "Complete required-feature acceptance is pending. The website feature article contains the explicit gap inventory.",
              "完整必需功能驗收尚待完成；網站功能文章列出待辦清單。",
            )}
          </p>
          <a href="#article/docs/features/website/acceptance"
            >${this.t("Read acceptance gaps", "閱讀驗收待辦")}</a
          >`;
      case "home":
        return html`<p class="eyebrow">MATERIAL COMPANION</p>
          <h1>
            ${this.t(
              "Understand the boundary. Then get to work.",
              "先了解界線，再開始工作。",
            )}
          </h1>
          <p class="lead">
            ${this.t(
              "Practical documentation for the desktop workspace, optional browser integration and the evidence behind current behavior.",
              "桌面工作區、可選瀏覽器整合及目前行為證據的實用說明。",
            )}
          </p>
          ${this.boundary()}
          <div class="actions">
            <md-filled-button href="#docs"
              >${this.t("Read documentation", "閱讀說明文件")}</md-filled-button
            ><md-outlined-button href="#status"
              >${this.t(
                "Inspect current verdicts",
                "查看目前驗證狀態",
              )}</md-outlined-button
            >
          </div>
          <h2>${this.t("Start with a real task", "由實際工作開始")}</h2>
          <div class="list">
            ${data.articles
              .filter((a) => !a.source.endsWith("README.md"))
              .map((a) => this.link("article/" + a.id, a.title, a.source))}
          </div>
          <section class="setting">
            <h2>
              ${this.t("Desktop and browser integration", "桌面及瀏覽器整合")}
            </h2>
            <p>
              ${this.t(
                "No verified installer release is available in this build. Optional pairing remains pending; documentation works without installation.",
                "此版本沒有經驗證的安裝程式發行。可選配對尚待完成；毋須安裝即可閱讀文件。",
              )}
            </p>
          </section>`;
      default:
        return html`<h1>${this.t("Page unavailable", "頁面不可用")}</h1>
          <a href="#home">${this.t("Return to overview", "返回總覽")}</a>`;
    }
  }
  render() {
    const selectedRoute = ["article", "category"].includes(
      this.route.split("/")[0],
    )
      ? "docs"
      : this.route.split("/")[0];
    return html`<a
        class="skip"
        href="#main-content"
        @click=${(e: Event) => {
          e.preventDefault();
          this.querySelector<HTMLElement>("main")?.focus();
        }}
        >${this.t("Skip to content", "跳至內容")}</a
      >
      <header class="topbar">
        <a class="brand" href="#home"
          >Material Companion<small
            >${this.t(
              "Documentation and project status",
              "說明文件及專案狀態",
            )}</small
          ></a
        ><md-text-button href="#settings"
          >${this.t("Preferences", "偏好設定")}</md-text-button
        >
      </header>
      <div class="layout">
        <nav
          class="rail"
          aria-label=${this.tText("Documentation navigation", "說明文件導覽")}
        >
          <div
            class="navigation"
            role="tablist"
            aria-orientation=${matchMedia("(max-width:700px)").matches
              ? "horizontal"
              : "vertical"}
            @keydown=${(e: KeyboardEvent) => {
              if(e.key===' '&&(e.target as HTMLElement).matches('[role=tab]')){e.preventDefault();(e.target as HTMLElement).click();return;}
              const tabs = [
                ...this.querySelectorAll<HTMLElement>("[role=tab]"),
              ];
              const i = tabs.indexOf(e.target as HTMLElement);
              if (
                i < 0 ||
                ![
                  "ArrowDown",
                  "ArrowUp",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                ].includes(e.key)
              )
                return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? tabs.length - 1
                    : (i +
                        (e.key === "ArrowUp" || e.key === "ArrowLeft"
                          ? -1
                          : 1) +
                        tabs.length) %
                      tabs.length;
              tabs[next].focus();
            }}
          >
            ${routes.map(
              ([id, en, yue]) =>
                html`<a
                  role="tab"
                  id=${"nav-" + id}
                  aria-controls="page-panel"
                  aria-selected=${selectedRoute === id}
                  tabindex=${selectedRoute === id ? 0 : -1}
                  href=${"#" + id}
                  >${this.t(en, yue)}</a
                >`,
            )}
          </div>
          <p class="rail-note">
            ${this.t(
              "Standalone reading. Optional installed integration. No guessed downloads.",
              "獨立閱讀，可選安裝整合，不提供猜測的下載。",
            )}
          </p>
        </nav>
        <main id="main-content" tabindex="-1"><div id="page-panel" role="tabpanel" aria-labelledby=${"nav-" + selectedRoute}>
          <div class="page-meta">
            <span
              >${this.t("Website version", "網站版本")}: ${data.version}</span
            ><span
              >${this.t("Source updated", "來源更新")}: ${data.updated}</span
            >
          </div>
          ${this.page()}</div>
          <footer>
            <a href="#privacy">${this.t("Privacy", "私隱")}</a
            ><a href="#settings">${this.t("Preferences", "偏好設定")}</a
            ><a href="#status"
              >${this.t("Evidence and limitations", "證據及限制")}</a
            >
          </footer>
        </main>
      </div>
      ${this.message
        ? html`<div class="snackbar" role="status">
            ${this.message}<md-text-button @click=${() => (this.message = "")}
              >${this.t("Dismiss", "關閉")}</md-text-button
            >
          </div>`
        : nothing}`;
  }
}
customElements.define("companion-docs", CompanionDocs);
