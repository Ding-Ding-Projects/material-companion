#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>
#include "workspace.h"
int main(int argc,char **argv){
 QGuiApplication app(argc,argv);
 app.setOrganizationName("MaterialCompanion"); app.setApplicationName("Material Companion");
 QQuickStyle::setStyle("Material");
 Workspace workspace; QQmlApplicationEngine engine;
 engine.rootContext()->setContextProperty("workspace",&workspace);
 QObject::connect(&engine,&QQmlApplicationEngine::objectCreationFailed,&app,[]{QCoreApplication::exit(1);},Qt::QueuedConnection);
 engine.loadFromModule("Companion","Main"); return app.exec();
}
