#pragma once
#include <QSqlDatabase>
#include <QJsonObject>
#include <QJsonArray>
#include <QLockFile>
#include <memory>
namespace companion {
class Core {
 QSqlDatabase db;
 QString session;
 QString ownershipPath;
 std::unique_ptr<QLockFile> ownership;
 void assertOwner() const;
 void sql(const QString &statement);
 public:
 explicit Core(const QString &path);
 static void validateRequest(const QJsonObject &request);
 ~Core();
 Core(const Core &)=delete;
 Core &operator=(const Core &)=delete;
 QJsonArray listJobs(int limit=100,int offset=0);
#ifdef COMPANION_TESTING
 void releaseOwnershipForTest() { ownership->unlock(); }
#endif
 void enableProject(const QString &project,const QString &scope);
 void revoke(const QString &project);
 QString review(const QJsonObject &request,int lifetimeSeconds=120);
 QJsonObject accept(const QJsonObject &request,const QString &reviewId);
 QJsonObject query(const QString &project,const QString &requestId);
 QJsonObject cancel(const QString &project,const QString &requestId);
 QJsonObject execute(const QJsonObject &request);
};
}
