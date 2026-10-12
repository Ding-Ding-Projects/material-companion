#include "core.h"
#include "protocol.h"
#include <QCoreApplication>
#include <QStandardPaths>
#include <QDir>
#include <QLocalServer>
#include <QLocalSocket>
#include <QJsonDocument>
#include <QJsonArray>
#include <QTimer>
#include <QCommandLineParser>
int main(int argc,char **argv) {
 QCoreApplication app(argc,argv); app.setOrganizationName("MaterialCompanion"); app.setApplicationName("MaterialCompanion");
 try {
  QCommandLineParser parser; parser.addOption({"data-root","Use an explicit local operation-store directory.","directory"}); parser.process(app);
  auto root=parser.isSet("data-root")?parser.value("data-root"):QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation); if(!QDir(root).isAbsolute()||!QDir().mkpath(root)) return 2;
  companion::Core core(root+"/operations.db"); QLocalServer server;
  // Qt sets a Windows named-pipe DACL limited to the current user.
  server.setSocketOptions(QLocalServer::UserAccessOption);
  if(!server.listen(companion::endpoint())) return 3;
  QObject::connect(&server,&QLocalServer::newConnection,&app,[&] {
   while(server.hasPendingConnections()) {
    auto socket=server.nextPendingConnection(); if(!companion::pipeOwnedByCurrentUser(socket->socketDescriptor())) { socket->abort(); socket->deleteLater(); continue; }
    auto timer=new QTimer(socket); timer->setSingleShot(true); timer->start(5000); QObject::connect(timer,&QTimer::timeout,socket,&QLocalSocket::abort);
    QObject::connect(socket,&QLocalSocket::disconnected,socket,&QObject::deleteLater);
    QObject::connect(socket,&QLocalSocket::readyRead,socket,[&,socket,timer] {
     auto buffer=socket->property("buffer").toByteArray()+socket->readAll();
     if(buffer.size()>companion::MaximumMessage+1) { socket->abort(); return; }
     socket->setProperty("buffer",buffer); if(!buffer.endsWith('\n')) return; timer->stop(); buffer.chop(1);
     QJsonObject reply;
     try {
      auto envelope=companion::parseEnvelope(buffer); auto request=envelope["request"].toObject(); auto method=envelope["method"].toString();
      if(method=="hello") {
       if(!request.isEmpty()) throw std::runtime_error("invalid-hello");
       reply={{"state","ready"},{"capabilities",QJsonArray{"text.sha256"}},{"reviewTransport","unavailable"}};
      } else if(method=="submit") {
       companion::Core::validateRequest(request);
       // Submission cannot create reviews or approval. Validation happens again
       // when the native workspace obtains the request for review.
       reply={{"state","native-review-required"},{"reason","Native workspace approval is required; automatic execution is unavailable."}};
      } else {
       if(request.size()!=2||!request["projectId"].isString()||!request["requestId"].isString()||request["projectId"].toString().isEmpty()||request["requestId"].toString().isEmpty()) throw std::runtime_error("invalid-identity");
       reply=method=="query"?core.query(request["projectId"].toString(),request["requestId"].toString()):core.cancel(request["projectId"].toString(),request["requestId"].toString());
      }
     } catch(...) { reply={{"state","rejected"},{"reason","Invalid or unauthorized request."}}; }
     reply["version"]=companion::ProtocolVersion; socket->write(companion::canonical(reply)+'\n'); socket->disconnectFromServer();
    });
   }
  }); return app.exec();
 } catch(...) { return 4; }
}
