import { LitElement, html, css, nothing } from "lit";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/switch/switch.js";
import "@material/web/checkbox/checkbox.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import "@material/web/slider/slider.js";
import {
  canonicalScope,
  validateProject,
  validateInput,
} from "../../adapter-kit/index.mjs";
import {
  loadVocabulary,
  ownedLabel,
  boundedSearch,
  PresentationStore,
} from "./presentation.mjs";
import { reconcileOperations } from "./operations.mjs";
type Tab =
  | "Projects"
  | "Inspector"
  | "Tools"
  | "Operations"
  | "Settings"
  | "Help";
const tabs: Tab[] = [
  "Projects",
  "Inspector",
  "Tools",
  "Operations",
  "Settings",
  "Help",
];
const zh: Record<string, string> = {
  Projects: "專案",
  Inspector: "檢視",
  Tools: "工具",
  Operations: "操作",
  Settings: "設定",
  Help: "說明",
  "Open full workspace": "開啟完整工作區",
  "Refresh current page": "重新讀取目前頁面",
  "Search records": "搜尋記錄",
  Clear: "清除",
  "Regex builder": "正則表示式建構器",
  Theme: "主題",
  Language: "語言",
  "Save scope": "儲存範圍",
  "Connect native host": "連接本機服務",
  "Personal presentation": "個人顯示用語",
  "Import JSON": "匯入 JSON",
  "Clear import": "清除匯入",
  "No projects stored": "尚未儲存專案",
  "Local text tool": "本機文字工具",
  "Input text": "輸入文字",
  "Count text": "計算文字",
  "Copy result": "複製結果",
  Cancel: "取消",
  Remove: "移除",
  "English humor": "英文幽默程度",
  "Cantonese humor": "廣東話幽默程度",
  "Reduced motion": "減少動畫",
  "Scope origin": "範圍來源",
  "Project path": "專案路徑",
  "Enable scope": "啟用範圍",
  "Project descriptor JSON": "專案描述 JSON",
  "Import project": "匯入專案",
  "Search pattern": "搜尋模式",
  "Literal text": "文字",
  "Starts with": "開頭為",
  "Ends with": "結尾為",
  "Apply pattern": "套用模式",
};
export class CompanionWorkspace extends LitElement {
  static properties = {
    tab: { state: true },
    settings: { state: true },
    projects: { state: true },
    scopes: { state: true },
    discovery: { state: true },
    native: { state: true },
    notice: { state: true },
    query: { state: true },
    regex: { state: true },
    builder: { state: true },
    vocabulary: { state: true },
    selection: { state: true },
    operations: { state: true },
    toolResult: { state: true },
    provenance: { state: true },
  };
  tab: Tab = "Projects";
  settings: any = {
    theme: "system",
    language: "en",
    englishHumor: 0,
    cantoneseHumor: 0,
    reducedMotion: true,
    tabs,
  };
  projects: any[] = [];
  scopes: any[] = [];
  discovery: any = { state: "not-inspected" };
  native = "disconnected";
  notice = "";
  query = "";
  regex = false;
  builder = false;
  vocabulary: any;
  selection = "";
  operations: any[] = [];
  toolResult = "";
  abort?: AbortController;
  textControllers = new Map<string, AbortController>();
  latestTextOperation = "";
  presentation = new PresentationStore(chrome.storage.local);
  provenance: any;
  storageChanged = (changes: any, area: string) => {
    if (area !== "local") return;
    if (changes.settings?.newValue) {
      this.settings = { ...this.settings, ...changes.settings.newValue };
      this.applySettings();
    }
    if (changes.projects?.newValue) {
      try {
        this.projects = changes.projects.newValue
          .slice(0, 64)
          .map(validateProject);
      } catch {
        this.notice = "Stored descriptor update rejected.";
      }
    }
    if (changes.operations?.newValue)
      this.operations = reconcileOperations(
        this.operations,
        changes.operations.newValue,
      );
    if (changes.vocabulary) {
      this.run(async () => {
        await this.presentation.restore();
        this.vocabulary = this.presentation.current;
      });
    }
  };
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--md-sys-color-background, #faf9ff);
      color: var(--md-sys-color-on-background, #191b24);
      font: 14px/1.5 system-ui;
      --md-sys-color-primary: #425e91;
      --md-sys-color-surface: #faf9ff;
      --md-sys-color-on-surface: #191b24;
      --md-sys-color-on-surface-variant: #44474f;
      --md-sys-color-outline: #74777f;
      --md-sys-color-secondary-container: #dae2f9;
      --md-sys-color-on-secondary-container: #111c2b;
    }
    :host([dark]) {
      --md-sys-color-background: #11131a;
      --md-sys-color-on-background: #e2e2ec;
      --md-sys-color-primary: #aac7ff;
      --md-sys-color-surface: #11131a;
      --md-sys-color-on-surface: #e2e2ec;
      --md-sys-color-on-surface-variant: #c4c6d0;
      --md-sys-color-outline: #8e9099;
      --md-sys-color-secondary-container: #3c475c;
      --md-sys-color-on-secondary-container: #dae2f9;
    }
    * {
      box-sizing: border-box;
    }
    header {
      padding: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    h1 {
      font-size: 22px;
      margin: 0;
    }
    h2 {
      font-size: 20px;
      margin: 0 0 12px;
    }
    p {
      overflow-wrap: anywhere;
    }
    nav {
      display: flex;
      gap: 8px;
      padding: 12px;
      overflow: auto;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    nav button {
      font: inherit;
      color: inherit;
      border: 0;
      border-radius: 24px;
      min-height: 48px;
      background: transparent;
      padding: 8px 16px;
      cursor: pointer;
      white-space: nowrap;
    }
    nav button[aria-selected="true"] {
      background: var(--md-sys-color-secondary-container);
      color: var(--md-sys-color-on-secondary-container);
    }
    button:focus-visible {
      outline: 3px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }
    main {
      padding: 16px;
      max-width: 1100px;
      margin: auto;
      min-width: 0;
    }
    .row {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .stack {
      display: grid;
      gap: 16px;
    }
    section,
    article {
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 16px;
      padding: 16px;
      min-width: 0;
    }
    md-outlined-text-field,
    md-outlined-select {
      width: 100%;
      min-width: 0;
    }
    md-slider {
      width: 100%;
    }
    .row md-outlined-text-field {
      flex: 1;
      min-width: 180px;
    }
    label {
      display: flex;
      gap: 12px;
      align-items: center;
      min-height: 48px;
    }
    output {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      display: block;
    }
    .status {
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid var(--md-sys-color-outline);
      margin-top: 12px;
    }
    .muted {
      font-size: 12px;
    }
    .help {
      margin: 0 0 8px;
    }
    input[type="file"] {
      max-width: 100%;
      min-height: 48px;
    }
    dialog {
      max-width: calc(100vw - 32px);
    }
    @media (min-width: 800px) {
      .columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      :host(:not([reduced])) article {
        transition: border-color 120ms ease;
      }
    }
  `;
  async connectedCallback() {
    super.connectedCallback();
    chrome.storage.onChanged.addListener(this.storageChanged);
    try {
      const metadata = await (
        await fetch(chrome.runtime.getURL("build.json"))
      ).json();
      if (
        metadata.version === "0.1.0" &&
        /^\d{4}-\d{2}-\d{2}T/.test(metadata.builtAt) &&
        /^[0-9a-f]{40}$/.test(metadata.sourceCommit)
      )
        this.provenance = metadata;
      const cache = await chrome.storage.local.get([
        "settings",
        "projects",
        "vocabulary",
        "operations",
      ]);
      if (cache.settings)
        this.settings = { ...this.settings, ...cache.settings };
      if (tabs.includes(this.settings.activeTab))
        this.tab = this.settings.activeTab;
      this.selection = this.settings.selection ?? "";
      this.query = this.settings.query ?? "";
      this.regex = this.settings.regex === true;
      this.projects = (cache.projects ?? []).slice(0, 64).map(validateProject);
      this.operations = reconcileOperations([], cache.operations ?? []);
      const presentationState = await this.presentation.restore();
      this.vocabulary = this.presentation.current;
      if (presentationState === "corrupt-cache-cleared")
        this.notice =
          "Corrupt presentation cache cleared; original wording restored.";
      this.scopes = (await this.send("scope-list")).scopes ?? [];
    } catch {
      this.notice =
        "Local settings could not be loaded. Browser functions remain available.";
    }
    this.applySettings();
  }
  disconnectedCallback() {
    chrome.storage.onChanged.removeListener(this.storageChanged);
    super.disconnectedCallback();
  }
  label(text: string) {
    const localized =
      this.settings.language === "zh-HK"
        ? (zh[text] ?? text)
        : this.settings.language === "bilingual" && zh[text]
          ? `${text} / ${zh[text]}`
          : text;
    return ownedLabel(localized, this.vocabulary);
  }
  applySettings() {
    const dark =
      this.settings.theme === "dark" ||
      (this.settings.theme === "system" &&
        matchMedia("(prefers-color-scheme:dark)").matches);
    this.toggleAttribute("dark", dark);
    this.toggleAttribute("reduced", this.settings.reducedMotion);
    document.documentElement.lang =
      this.settings.language === "zh-HK" ? "zh-HK" : "en";
  }
  async save() {
    await chrome.storage.local.set({
      settings: {
        ...this.settings,
        activeTab: this.tab,
        selection: this.selection,
        query: this.query,
        regex: this.regex,
      },
      projects: this.projects,
    });
    this.applySettings();
  }
  async set(key: string, value: any) {
    this.settings = { ...this.settings, [key]: value };
    await this.save();
  }
  send(type: string, data: any = {}) {
    return chrome.runtime.sendMessage({ type, ...data });
  }
  value(id: string) {
    return (
      (this.renderRoot.querySelector("#" + id) as HTMLInputElement)?.value ?? ""
    );
  }
  async run(fn: () => Promise<any> | any) {
    try {
      await fn();
    } catch (e) {
      this.notice = e instanceof Error ? e.message : "Operation unavailable";
    }
  }
  async refresh() {
    this.discovery = await this.send("discover");
    this.native = (await this.send("native-state")).state;
    if (this.discovery.state === "ready") {
      const d = this.discovery.descriptor;
      this.projects = [...this.projects.filter((p) => p.id !== d.id), d].slice(
        0,
        64,
      );
      this.selection = d.id;
      await this.save();
    }
    this.notice = `Current page: ${this.discovery.state}.`;
  }
  async importProject() {
    const d = validateProject(JSON.parse(this.value("descriptor")));
    this.projects = [...this.projects.filter((p) => p.id !== d.id), d].slice(
      0,
      64,
    );
    this.selection = d.id;
    await this.save();
    this.notice =
      "Project descriptor stored locally. This does not enable its page scope.";
  }
  async scopeSave() {
    const origin = this.value("origin"),
      path = this.value("path");
    canonicalScope(origin, path);
    const enabled = (this.renderRoot.querySelector("#enabled") as any).selected;
    if (
      enabled &&
      !(await chrome.permissions.request({ origins: [origin + "/*"] }))
    ) {
      this.notice =
        "Browser permission was not granted; scope was not enabled.";
      return;
    }
    const reply = await this.send("scope-save", { origin, path, enabled });
    if (reply.state !== "saved") throw new Error("Scope could not be saved");
    this.scopes = (await this.send("scope-list")).scopes;
    this.notice = "Scope saved locally.";
  }
  async importVocabulary(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (file.size > 1048576)
        throw new Error("Presentation file exceeds limit");
      await this.presentation.replace(await file.text());
      this.vocabulary = this.presentation.current;
      this.notice = "Presentation file loaded locally.";
    } catch {
      this.notice = "Presentation file rejected; current wording kept.";
    } finally {
      (event.target as HTMLInputElement).value = "";
    }
  }
  async countText() {
    const text = this.value("text");
    if (text.length > 65536) throw new Error("Text limit: 65,536 characters");
    const controller = new AbortController();
    this.abort = controller;
    const op = {
      id: crypto.randomUUID(),
      kind: "text-count",
      state: "running",
      createdAt: new Date().toISOString(),
    };
    this.latestTextOperation = op.id;
    this.textControllers.set(op.id, controller);
    await this.persistOperation(op);
    await new Promise((r) => setTimeout(r, 50));
    const finalState = controller.signal.aborted ? "cancelled" : "completed";
    this.textControllers.delete(op.id);
    this.abort = [...this.textControllers.values()].at(-1);
    await this.persistOperation({ ...op, state: finalState });
    if (this.latestTextOperation !== op.id) return;
    if (finalState === "cancelled") {
      this.notice = "Local operation cancelled.";
    } else {
      this.toolResult = `Characters: ${Array.from(text).length}\nWords: ${text.trim() ? text.trim().split(/\s+/u).length : 0}\nLines: ${text.split(/\r?\n/).length}`;
      this.notice =
        this.settings.language === "zh-HK"
          ? this.settings.cantoneseHumor > 50
            ? "數好晒，文字冇偷偷加班。"
            : "文字計算完成。"
          : this.settings.englishHumor > 50
            ? "Count finished. The words stayed in their lane."
            : "Text count completed.";
    }
  }
  async persistOperation(operation: any) {
    this.operations = reconcileOperations(this.operations, [operation]);
    const reply = await this.send("operation-update", { operation });
    if (!Array.isArray(reply.operations))
      throw new Error("Operation record could not be persisted");
    this.operations = reconcileOperations(this.operations, reply.operations);
  }
  registry(id: string, help: string, body: any) {
    return html`<article
      data-element-id=${id}
      data-component="material-surface-composition"
      data-state="ready"
      aria-describedby=${id + "-help"}
    >
      <p class="help" id=${id + "-help"}>${help}</p>
      ${body}
    </article>`;
  }
  render() {
    return html`<header data-element-id="extension.scope-header">
        <h1>${this.label("Material Companion")}</h1>
        <div class="muted">
          Version 0.1.0 ·
          ${this.provenance
            ? `Updated ${this.provenance.builtAt} · source ${this.provenance.sourceCommit.slice(0, 12)}`
            : "build metadata unavailable"}
        </div>
        <p>
          ${this.label("Native host")}: <strong>${this.native}</strong>.
          ${this.label("Current page")}: ${this.discovery.state}
        </p>
        <div class="row">
          <md-outlined-button
            @click=${() =>
              this.run(async () => {
                await this.save();
                await chrome.tabs.create({
                  url: chrome.runtime.getURL("workspace.html"),
                });
              })}
            >${this.label("Open full workspace")}</md-outlined-button
          ><md-filled-button @click=${() => this.run(() => this.refresh())}
            >${this.label("Refresh current page")}</md-filled-button
          >
        </div>
      </header>
      <nav
        role="tablist"
        aria-label=${this.label("Workspace tabs")}
        data-element-id="extension.tabs"
      >
        ${tabs.map(
          (t) =>
            html`<button
              role="tab"
              aria-selected=${this.tab === t}
              aria-controls="panel"
              @click=${() => {
                this.tab = t;
                this.run(() => this.save());
              }}
            >
              ${this.label(t)}
            </button>`,
        )}
      </nav>
      <main id="panel" role="tabpanel" aria-label=${this.label(this.tab)}>
        <div class="stack">
          <div class="row">
            <md-outlined-text-field
              id="search"
              label=${this.label("Search records")}
              .value=${this.query}
              @input=${(e: any) => {
                this.query = e.target.value;
              }}
            ></md-outlined-text-field
            ><md-outlined-button
              @click=${() => {
                this.query = "";
              }}
              >${this.label("Clear")}</md-outlined-button
            ><md-outlined-button
              @click=${() => {
                this.builder = !this.builder;
              }}
              aria-expanded=${this.builder}
              >${this.label("Regex builder")}</md-outlined-button
            >
          </div>
          ${this.builder ? this.renderBuilder() : nothing}${this.renderTab()}
        </div>
        ${this.notice
          ? html`<div class="status" role="status" aria-live="polite">
              ${this.notice}<md-outlined-button
                @click=${() => {
                  this.notice = "";
                }}
                >${this.label("Clear")}</md-outlined-button
              >
            </div>`
          : nothing}
      </main>`;
  }
  renderBuilder() {
    return this.registry(
      "search.builder",
      "Build a bounded pattern anchored to this search only.",
      html`<md-outlined-text-field
          id="pattern"
          label=${this.label("Literal text")}
        ></md-outlined-text-field
        ><label
          ><md-checkbox id="start"></md-checkbox>${this.label(
            "Starts with",
          )}</label
        ><label
          ><md-checkbox id="end"></md-checkbox>${this.label("Ends with")}</label
        ><md-filled-button
          @click=${() => {
            const text = this.value("pattern").replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&",
            );
            this.query =
              ((this.renderRoot.querySelector("#start") as any).checked
                ? "^"
                : "") +
              text +
              ((this.renderRoot.querySelector("#end") as any).checked
                ? "$"
                : "");
            this.regex = true;
            this.builder = false;
          }}
          >${this.label("Apply pattern")}</md-filled-button
        ><label
          ><md-switch
            .selected=${this.regex}
            @change=${(e: any) => {
              this.regex = e.target.selected;
            }}
          ></md-switch
          >Regex mode</label
        >`,
    );
  }
  renderTab() {
    if (this.tab === "Projects") {
      let records: any[] = [];
      try {
        records = this.projects.filter((p) =>
          boundedSearch(this.query, this.regex)(p.name + " " + p.id),
        );
      } catch (e) {
        return html`<p role="alert">${(e as Error).message}</p>`;
      }
      return html`<h2>${this.label("Projects")}</h2>
        ${records.length
          ? records.map((p) =>
              this.registry(
                "project." + p.id,
                `${p.scope.origin}${p.scope.path}`,
                html`<h3>${p.name}</h3>
                  <p>${p.id} · adapter ${p.adapterVersion}</p>
                  <md-filled-button
                    @click=${() => {
                      this.selection = p.id;
                      this.tab = "Inspector";
                      this.run(() => this.save());
                    }}
                    >${this.label("Inspector")}</md-filled-button
                  ><md-outlined-button
                    @click=${() =>
                      this.run(async () => {
                        this.projects = this.projects.filter(
                          (x) => x.id !== p.id,
                        );
                        await this.save();
                      })}
                    >${this.label("Remove")}</md-outlined-button
                  >`,
              ),
            )
          : html`<p>${this.label("No projects stored")}</p>`}${this.registry(
          "projects.import",
          "Import declarative JSON only. No page code is executed.",
          html`<md-outlined-text-field
              id="descriptor"
              type="textarea"
              rows="5"
              label=${this.label("Project descriptor JSON")}
            ></md-outlined-text-field
            ><md-filled-button
              @click=${() => this.run(() => this.importProject())}
              >${this.label("Import project")}</md-filled-button
            >`,
        )}${this.registry(
          "projects.scope",
          "Explicit enablement requests browser permission. Path matching stays exact.",
          html`<md-outlined-text-field
              id="origin"
              label=${this.label("Scope origin")}
              placeholder="https://example.github.io"
            ></md-outlined-text-field
            ><md-outlined-text-field
              id="path"
              label=${this.label("Project path")}
              placeholder="/project/"
            ></md-outlined-text-field
            ><label
              ><md-switch id="enabled"></md-switch>${this.label(
                "Enable scope",
              )}</label
            ><md-filled-button @click=${() => this.run(() => this.scopeSave())}
              >${this.label("Save scope")}</md-filled-button
            >${this.scopes.map(
              (s) =>
                html`<p>
                  ${s.origin}${s.path}:
                  ${s.enabled ? "enabled" : "disabled"}<md-outlined-button
                    @click=${() =>
                      this.run(async () => {
                        await this.send("scope-save", {
                          ...s,
                          enabled: !s.enabled,
                        });
                        this.scopes = (await this.send("scope-list")).scopes;
                      })}
                    >${s.enabled ? "Disable" : "Enable"}</md-outlined-button
                  >
                </p>`,
            )}`,
        )}`;
    }
    if (this.tab === "Inspector") {
      const p = this.projects.find((p) => p.id === this.selection);
      return p
        ? html`<h2>${p.name}</h2>
            <p>
              Stored descriptors are snapshots. Refresh the current page before
              a native request.
            </p>
            ${p.surfaces.map((s: any) =>
              this.registry(
                "surface." + s.id,
                s.route,
                html`<h3>${s.id} · ${s.state}</h3>
                  ${s.elements.map(
                    (e: any) =>
                      html`<p data-element-id=${e.id} data-state=${e.state}>
                        <strong>${e.label}</strong>: ${String(e.value ?? "")} ·
                        ${e.role}<br />${e.help}
                      </p>`,
                  )}`,
              ),
            )}${p.actions.map((a: any) =>
              this.registry(
                "action." + a.id,
                `${a.effect} effect. ${a.effect === "native" ? "Native installation, connection, explicit grant and separate trusted review required." : "Declarative page actions are inspectable; this extension does not execute page handlers."}`,
                html`<h3>${a.label}</h3>
                  <p>
                    Cancellation: ${a.cancellable ? "supported" : "unavailable"}
                    · Retry: ${a.retryable ? "supported" : "unavailable"}
                  </p>`,
              ),
            )}`
        : html`<p>Select a project first.</p>`;
    }
    if (this.tab === "Tools")
      return html`<h2>${this.label("Local text tool")}</h2>
        ${this.registry(
          "tools.text",
          "Text remains in this extension. Count up to 65,536 characters without a native host.",
          html`<md-outlined-text-field
              id="text"
              type="textarea"
              rows="8"
              label=${this.label("Input text")}
            ></md-outlined-text-field>
            <div class="row">
              <md-filled-button @click=${() => this.run(() => this.countText())}
                >${this.label("Count text")}</md-filled-button
              ><md-outlined-button @click=${() => this.abort?.abort()}
                >${this.label("Cancel")}</md-outlined-button
              ><md-outlined-button
                @click=${() => {
                  const field = this.renderRoot.querySelector("#text") as any;
                  field.value = "";
                  this.toolResult = "";
                }}
                >${this.label("Clear")}</md-outlined-button
              >
            </div>
            <output>${this.toolResult}</output
            ><md-outlined-button
              ?disabled=${!this.toolResult}
              @click=${() =>
                this.run(() => navigator.clipboard.writeText(this.toolResult))}
              >${this.label("Copy result")}</md-outlined-button
            >`,
        )}`;
    if (this.tab === "Operations")
      return html`<h2>${this.label("Operations")}</h2>
        ${this.operations.length
          ? this.operations
              .filter((o) =>
                boundedSearch(this.query, this.regex)(o.kind + " " + o.state),
              )
              .map(
                (o) =>
                  html`<article>
                    <strong>${o.kind}</strong>
                    <p>${o.state} · ${o.createdAt}</p>
                    <p>${o.id}</p>
                  </article>`,
              )
          : html`<p>No operations recorded.</p>`}`;
    if (this.tab === "Settings")
      return html`<h2>${this.label("Settings")}</h2>
        <div class="columns">
          ${this.registry(
            "settings.appearance",
            "Changes are local to the side panel and full workspace.",
            html`<md-outlined-select
                label=${this.label("Theme")}
                .value=${this.settings.theme}
                @change=${(e: any) =>
                  this.run(() => this.set("theme", e.target.value))}
                >${["system", "light", "dark"].map(
                  (v) =>
                    html`<md-select-option value=${v}
                      ><div slot="headline">${v}</div></md-select-option
                    >`,
                )}</md-outlined-select
              ><md-outlined-select
                label=${this.label("Language")}
                .value=${this.settings.language}
                @change=${(e: any) =>
                  this.run(() => this.set("language", e.target.value))}
                >${["en", "zh-HK", "bilingual"].map(
                  (v) =>
                    html`<md-select-option value=${v}
                      ><div slot="headline">${v}</div></md-select-option
                    >`,
                )}</md-outlined-select
              >
              <p>
                ${this.label("English humor")}: ${this.settings.englishHumor}
              </p>
              <md-slider
                min="0"
                max="100"
                .value=${this.settings.englishHumor}
                aria-label=${this.label("English humor")}
                @change=${(e: any) =>
                  this.run(() => this.set("englishHumor", e.target.value))}
              ></md-slider>
              <p>
                ${this.label("Cantonese humor")}:
                ${this.settings.cantoneseHumor}
              </p>
              <md-slider
                min="0"
                max="100"
                .value=${this.settings.cantoneseHumor}
                aria-label=${this.label("Cantonese humor")}
                @change=${(e: any) =>
                  this.run(() => this.set("cantoneseHumor", e.target.value))}
              ></md-slider
              ><label
                ><md-switch
                  .selected=${this.settings.reducedMotion}
                  @change=${(e: any) =>
                    this.run(() =>
                      this.set("reducedMotion", e.target.selected),
                    )}
                ></md-switch
                >${this.label("Reduced motion")}</label
              >`,
          )}${this.registry(
            "settings.presentation",
            "Local replacement affects owned labels only. Original product identity, page content and external records stay unchanged.",
            html`<h3>${this.label("Personal presentation")}</h3>
              <label
                >${this.label("Import JSON")}<input
                  type="file"
                  accept="application/json,.json"
                  @change=${this.importVocabulary}
              /></label>
              <p>
                ${this.vocabulary
                  ? "Local presentation loaded"
                  : "Original wording active"}
              </p>
              <md-outlined-button
                @click=${() =>
                  this.run(async () => {
                    await this.presentation.clear();
                    this.vocabulary = undefined;
                    this.notice = "Original wording restored.";
                  })}
                >${this.label("Clear import")}</md-outlined-button
              >`,
          )}${this.registry(
            "settings.native",
            "No native approval is issued by this extension. Install the documented host, connect and grant each project from the trusted native workspace.",
            html`<p>Connection: ${this.native}</p>
              <p>
                Native review transport: unavailable in this foundation.
                Connected status does not authorize operation submission.
              </p>
              <md-filled-button
                @click=${() =>
                  this.run(async () => {
                    this.native = (await this.send("native-connect")).state;
                  })}
                >${this.label("Connect native host")}</md-filled-button
              >
              <p>
                Native requests remain unavailable until host identity, grant
                and trusted review are verified.
              </p>`,
          )}
        </div>`;
    return html`<h2>${this.label("Help")}</h2>
      <article>
        <p>
          This browser workspace works independently of the desktop host. Only
          explicit HTTPS GitHub Pages origin and project path pairs are
          inspected, only in the top frame.
        </p>
        <p>
          Publish an inert application/json script with data-material-companion
          to expose a declarative descriptor. It never contains executable
          adapter code.
        </p>
        <p>
          Initial foundation: project discovery, scope management, local text
          counts, persistent tabs/settings/history and local presentation
          imports. Full appearance editors, animation editors, locks, conversion
          tools, server management, notification history and complete command
          palette remain unimplemented.
        </p>
        <p>
          Visual, runtime browser integration and packaged native acceptance are
          not yet verified.
        </p>
      </article>`;
  }
}
customElements.define("companion-workspace", CompanionWorkspace);
