#include "protocol.h"
#include <QCoreApplication>
#include <QLocalSocket>
#include <QJsonDocument>
#include <QtEndian>
#include <QRegularExpression>
#include <cstdio>
#ifdef Q_OS_WIN
#include <io.h>
#include <fcntl.h>
#endif
int main(int argc,char **argv) {
 QCoreApplication app(argc,argv);
#ifdef Q_OS_WIN
 _setmode(_fileno(stdin),_O_BINARY); _setmode(_fileno(stdout),_O_BINARY);
#endif
 try {
  auto args=app.arguments();
  // The registration process must supply the exact public installed ID. There
  // is no wildcard/default ID and the page cannot modify the host environment.
  auto id=qEnvironmentVariable("MATERIAL_COMPANION_EXTENSION_ID");
  if(!QRegularExpression("^[a-p]{32}$").match(id).hasMatch()||args.size()<2||args[1]!="chrome-extension://"+id+"/") return 2;
  for(;;) {
   quint32 length=0; auto count=fread(&length,1,4,stdin); if(count==0&&feof(stdin)) return 0; if(count!=4) return 3;
   length=qFromLittleEndian(length); if(length==0||length>companion::MaximumMessage) return 3;
   QByteArray data(length,0); if(fread(data.data(),1,length,stdin)!=length) return 3;
   auto envelope=companion::parseEnvelope(data); Q_UNUSED(envelope);
   QLocalSocket socket; socket.connectToServer(companion::endpoint()); if(!socket.waitForConnected(3000)||!companion::pipeOwnedByCurrentUser(socket.socketDescriptor())) return 4;
   socket.write(data+'\n'); if(!socket.waitForBytesWritten(3000)||!socket.waitForReadyRead(5000)) return 4;
   QByteArray response; while(!response.endsWith('\n')) { response+=socket.readAll(); if(response.size()>companion::MaximumMessage) return 4; if(!response.endsWith('\n')&&!socket.waitForReadyRead(5000)) return 4; }
   response.chop(1); auto size=qToLittleEndian(quint32(response.size())); if(fwrite(&size,1,4,stdout)!=4||fwrite(response.data(),1,response.size(),stdout)!=size||fflush(stdout)!=0) return 5;
  }
 } catch(...) { return 6; }
}
