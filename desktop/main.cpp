#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>
#include <QCommandLineParser>
#include "workspace.h"
int main(int argc,char **argv){
 QGuiApplication app(argc,argv);
 app.setOrganizationName("MaterialCompanion"); app.setApplicationName("Material Companion");
 QQuickStyle::setStyle("Material");
 QCommandLineParser parser;parser.addHelpOption();
 parser.addOption({"data-root","Use an explicit local data directory for this isolated workspace.","directory"});parser.process(app);
 Workspace workspace(nullptr,parser.value("data-root")); QQmlApplicationEngine engine;
 engine.rootContext()->setContextProperty("workspace",&workspace);
 QObject::connect(&engine,&QQmlApplicationEngine::objectCreationFailed,&app,[]{QCoreApplication::exit(1);},Qt::QueuedConnection);
 engine.loadFromModule("Companion","Main"); return app.exec();
}
