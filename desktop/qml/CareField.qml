import QtQuick
import QtQuick.Controls
TextField {
 id: field
 rightPadding: 48
 selectByMouse: true
 Accessible.name: placeholderText
 ToolButton { anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter; text: "×"; visible: field.text.length > 0; Accessible.name: {const settings=workspace.settings;return workspace.label("Clear", "清除")+" "+field.placeholderText}; onClicked: { field.clear(); field.forceActiveFocus() } }
}
