import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
import QtQuick.Dialogs
ApplicationWindow {
 id: shell
 objectName: "shell.window"
 width: 1440; height: 960; minimumWidth: 960; minimumHeight: 640
 visible: true; flags: Qt.Window | Qt.FramelessWindowHint
 title: "Material Companion"
 Material.theme: workspace.settings.dark ? Material.Dark : Material.Light
 Material.accent: "#6750A4"
 property int page: workspace.settings.tab
 property string selectedProject: ""
 function tr(en, zh) { const revision = workspace.settings; return workspace.label(en, zh) }
 header: Rectangle {
  objectName: "shell.title"; height: 48; color: Material.backgroundColor
  RowLayout { anchors.fill: parent; spacing: 8
   Label { text: "◈"; leftPadding: 16; font.pixelSize: 24 }
   Label { text: "Material Companion"; font.bold: true }
   Label { text: "0.1 foundation · Build date unavailable"; opacity: 0.65 }
   Item { Layout.fillWidth: true; Layout.fillHeight: true; DragHandler { onActiveChanged: if (active) shell.startSystemMove() } }
   ToolButton { text: "−"; Accessible.name: "Minimize"; onClicked: shell.showMinimized() }
   ToolButton { text: shell.visibility === Window.Maximized ? "❐" : "□"; Accessible.name: "Maximize or restore"; onClicked: shell.visibility === Window.Maximized ? shell.showNormal() : shell.showMaximized() }
   ToolButton { text: "×"; Accessible.name: "Close"; onClicked: shell.close() }
  }
 }
 RowLayout { anchors.fill: parent; spacing: 0
  Pane {
   objectName: "shell.tabs"; Layout.preferredWidth: shell.width < 1100 ? 160 : 224; Layout.fillHeight: true
   ColumnLayout { anchors.fill: parent
    Label { text: shell.tr("Workspace", "工作空間"); font.pixelSize: 20; font.bold: true }
    Repeater { model: [shell.tr("Projects", "專案"),shell.tr("Text tools", "文字工具"),shell.tr("Operations", "操作紀錄"),shell.tr("Settings", "設定"),shell.tr("Help", "說明")]
     Button { required property int index; required property string modelData; text: modelData; Layout.fillWidth: true; checkable: true; checked: shell.page === index; onClicked: workspace.setSetting("tab",index); Accessible.role: Accessible.PageTab }
    }
    Item { Layout.fillHeight: true }
    Label { text: shell.tr("Browser: disconnected\nNative workspace: local", "瀏覽器：未連接\n原生工作空間：本機"); wrapMode: Text.Wrap; Layout.fillWidth: true }
   }
  }
  ScrollView { Layout.fillWidth: true; Layout.fillHeight: true; contentWidth: availableWidth
   ColumnLayout { width: parent.width; spacing: 16
    Label { text: [shell.tr("Projects and explicit grants", "專案與明確授權"),shell.tr("Bounded text hashing", "有界文字雜湊"),shell.tr("Durable operation history", "持久操作紀錄"),shell.tr("Local presentation settings", "本機顯示設定"),shell.tr("Workspace help", "工作空間說明")][shell.page]; font.pixelSize: 28; Layout.margins: 24 }
    ColumnLayout { visible: shell.page === 0; Layout.fillWidth: true; Layout.margins: 24
     Label { text: shell.tr("Create a project with the exact HTTPS path it may use.", "建立專案，明確指定可使用的 HTTPS 路徑。"); wrapMode: Text.Wrap; Layout.fillWidth: true }
     CareField { id: projectName; objectName: "projects.name"; placeholderText: shell.tr("Project name", "專案名稱"); Layout.fillWidth: true }
     CareField { id: projectScope; objectName: "projects.scope"; placeholderText: "https://example.com/project"; Layout.fillWidth: true }
     Button { objectName: "projects.create"; text: shell.tr("Create and grant this scope", "建立並授權此範圍"); highlighted: true; onClicked: workspace.createProject(projectName.text,projectScope.text) }
     Label { visible: workspace.projects.length === 0; text: shell.tr("No projects yet. Create one above to start.", "尚未有專案。請在上方建立。") }
     Repeater { model: workspace.projects
      Frame { required property var modelData; Layout.fillWidth: true
       RowLayout { anchors.fill: parent
        ColumnLayout { Layout.fillWidth: true; Label { text: modelData.name; font.bold: true } Label { text: modelData.scope; wrapMode: Text.Wrap; Layout.fillWidth: true } Label { text: modelData.enabled ? shell.tr("Grant active", "授權有效") : shell.tr("Grant revoked", "授權已撤銷") } }
        Button { text: shell.tr("Use", "使用"); enabled: modelData.enabled; onClicked: { shell.selectedProject=modelData.id; workspace.setSetting("tab",1) } }
        Button { text: shell.tr("Revoke", "撤銷"); enabled: modelData.enabled; onClicked: workspace.revoke(modelData.id) }
       }
      }
     }
    }
    ColumnLayout { visible: shell.page === 1; Layout.fillWidth: true; Layout.margins: 24
     Label { text: shell.selectedProject ? shell.tr("Selected project", "已選取專案") + ": " + shell.selectedProject : shell.tr("Select an active project from Projects first.", "請先在專案頁選取已授權專案。"); wrapMode: Text.Wrap; Layout.fillWidth: true }
     Label { text: shell.tr("Text stays in memory. History contains the digest, never the submitted content. Maximum 64 KiB UTF-8.", "文字只留在記憶體。紀錄只保存摘要，不保存輸入內容。UTF-8 上限為 64 KiB。"); wrapMode: Text.Wrap; Layout.fillWidth: true }
     TextArea { id: textInput; objectName: "tools.text"; placeholderText: shell.tr("Text to hash", "要雜湊的文字"); Layout.fillWidth: true; Layout.preferredHeight: 200; wrapMode: TextEdit.Wrap; selectByMouse: true; Accessible.name: placeholderText }
     RowLayout { Button { text: shell.tr("Clear text", "清除文字"); onClicked: { textInput.clear(); textInput.forceActiveFocus() } } Button { id: reviewButton; objectName: "review.prepare"; text: shell.tr("Review SHA-256", "檢視 SHA-256"); highlighted: true; enabled: !!shell.selectedProject && !workspace.busy; onClicked: workspace.prepare(shell.selectedProject,textInput.text) } }
     BusyIndicator { running: workspace.busy; visible: running; Accessible.name: "Executing bounded SHA-256" }
    }
    ColumnLayout { visible: shell.page === 2; Layout.fillWidth: true; Layout.margins: 24
     Label { visible: workspace.operations.length === 0; text: shell.tr("No accepted operations.", "尚未有獲接受操作。") }
     Repeater { model: workspace.operations
      Frame { required property var modelData; Layout.fillWidth: true; ColumnLayout { anchors.fill: parent; Label { text: "Job: " + (modelData.jobId || "unavailable"); wrapMode: Text.Wrap; Layout.fillWidth: true } Label { text: "State: " + (modelData.state || "unknown") } Label { text: JSON.stringify(modelData.result || {}); wrapMode: Text.WrapAnywhere; Layout.fillWidth: true } } }
     }
    }
    ColumnLayout { visible: shell.page === 3; Layout.fillWidth: true; Layout.margins: 24
     Label { text: shell.tr("Language", "語言") }
     ComboBox { model: ["English", "廣東話", "English / 廣東話"]; currentIndex: workspace.settings.language; onActivated: workspace.setSetting("language",currentIndex); Accessible.name: "Language" }
     Switch { text: shell.tr("Dark theme", "深色主題"); checked: workspace.settings.dark; onToggled: workspace.setSetting("dark",checked) }
     Switch { text: shell.tr("Reduced motion", "減少動畫"); checked: workspace.settings.reducedMotion; onToggled: workspace.setSetting("reducedMotion",checked) }
     Label { text: "English humor: " + workspace.settings.englishHumor }
     Slider { from: 0; to: 10; stepSize: 1; value: workspace.settings.englishHumor; onMoved: workspace.setSetting("englishHumor",value); Accessible.name: "English humor" }
     Label { text: "廣東話幽默：" + workspace.settings.cantoneseHumor }
     Slider { from: 0; to: 10; stepSize: 1; value: workspace.settings.cantoneseHumor; onMoved: workspace.setSetting("cantoneseHumor",value); Accessible.name: "Cantonese humor" }
     Label { text: workspace.settings.englishHumor > 0 && workspace.settings.language !== 1 ? "No cloud required. Your text has enough places to be already." : ""; wrapMode: Text.Wrap; Layout.fillWidth: true }
     Label { text: workspace.settings.cantoneseHumor > 0 && workspace.settings.language !== 0 ? "文字留喺本機，唔使四圍去旅行。" : ""; wrapMode: Text.Wrap; Layout.fillWidth: true }
     Button { text: shell.tr("Load local vocabulary JSON", "載入本機用語 JSON"); onClicked: vocabularyPicker.open() }
     Button { text: shell.tr("Restore original wording", "還原原有用語"); enabled: workspace.settings.vocabularyLoaded; onClicked: workspace.clearVocabulary() }
     Label { text: shell.tr("Display wording is session-only. It never changes operation records or browser page content.", "顯示用語只適用於本次使用，不會更改操作紀錄或瀏覽器網頁內容。"); wrapMode: Text.Wrap; Layout.fillWidth: true }
    }
    Label { visible: shell.page === 4; Layout.margins: 24; Layout.fillWidth: true; wrapMode: Text.Wrap; text: shell.tr("Create a project, select it, enter text, review exact effects and authorize locally. The browser bridge is not connected by this workspace build. Broader appearance, locks, file conversion, model and server management are not implemented.", "建立專案並選取，輸入文字，檢視實際效果，再於本機授權。此版本工作空間未連接瀏覽器橋接。完整外觀、鎖定、檔案轉換、模型及伺服器管理尚未實作。") }
   }
  }
 }
 footer: Pane { visible: workspace.notice.length > 0; objectName: "workspace.notifications"; RowLayout { anchors.fill: parent; Label { Layout.fillWidth: true; text: workspace.notice; wrapMode: Text.WrapAnywhere; Accessible.role: Accessible.AlertMessage } Button { text: shell.tr("Dismiss", "關閉"); onClicked: workspace.dismissNotice() } } opacity: 1; Behavior on opacity { NumberAnimation { duration: workspace.settings.reducedMotion ? 0 : 150 } } }
 Dialog { id: reviewDialog; objectName: "review.dialog"; anchors.centerIn: parent; width: Math.min(shell.width-80,640); modal: true; title: shell.tr("Review exact operation", "檢視實際操作"); closePolicy: Popup.CloseOnEscape; visible: workspace.reviewSummary.length > 0
  contentItem: ColumnLayout { Label { text: workspace.reviewSummary; wrapMode: Text.Wrap; Layout.fillWidth: true } RowLayout { Button { text: shell.tr("Cancel", "取消"); enabled: !workspace.busy; onClicked: workspace.dismissReview() } Button { text: shell.tr("Authorize this operation", "授權此操作"); highlighted: true; enabled: !workspace.busy; onClicked: workspace.authorize() } } }
  onClosed: { workspace.dismissReview(); reviewButton.forceActiveFocus() }
 }
 FileDialog { id: vocabularyPicker; nameFilters: ["JSON files (*.json)"]; onAccepted: workspace.loadVocabulary(selectedFile) }
}
