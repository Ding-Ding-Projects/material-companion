import QtQuick
import QtQuick.Controls
TextField {
 id: field
 rightPadding: 48
 selectByMouse: true
 Accessible.name: placeholderText
 ToolButton { anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter; text: "×"; visible: field.text.length > 0; Accessible.name: "Clear " + field.placeholderText; onClicked: { field.clear(); field.forceActiveFocus() } }
}
