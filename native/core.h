#pragma once
#include <QSqlDatabase>
#include <QJsonObject>
namespace companion {
class Core {
 QSqlDatabase db;
 QString session;
 void sql(const QString &statement);
 public:
 explicit Core(const QString &path);
 static void validateRequest(const QJsonObject &request);
 ~Core();
 void enableProject(const QString &project,const QString &scope);
 void revoke(const QString &project);
 QString review(const QJsonObject &request,int lifetimeSeconds=120);
 QJsonObject accept(const QJsonObject &request,const QString &reviewId);
 QJsonObject query(const QString &project,const QString &requestId);
 QJsonObject cancel(const QString &project,const QString &requestId);
 QJsonObject execute(const QJsonObject &request);
};
}
