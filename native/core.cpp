#include "core.h"
#include "protocol.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QUuid>
#include <QDateTime>
#include <QCryptographicHash>
#include <stdexcept>
namespace companion {
static void fail(const QString &s) { throw std::runtime_error(s.toStdString()); }
static void run(QSqlQuery &q) { if(!q.exec()) fail(q.lastError().text()); }
static void validate(const QJsonObject &r) {
 const QStringList fields={"requestId","projectId","scope","url","adapterVersion","actionId","text","targetId","targetRevision","documentId","tabId","frameId","grantGeneration"};
 if(r.size()!=fields.size()) fail("request-fields");
 for(const auto &f:fields) if(!r.contains(f)) fail("missing-request-field");
 for(const auto &f:fields) if(f!="grantGeneration"&&(!r[f].isString()||r[f].toString().isEmpty())) fail("request-field-type");
 if(!r["grantGeneration"].isDouble()||r["grantGeneration"].toDouble()!=r["grantGeneration"].toInt()||r["grantGeneration"].toInt()<1) fail("grant-generation");
 for(const auto &f:fields) if(f!="text"&&r[f].isString()&&r[f].toString().size()>2048) fail("field-bound");
 if(r["text"].toString().toUtf8().size()>65536) fail("text-bound");
 if(r["actionId"]!="text.sha256"||r["adapterVersion"]!="1"||r["targetId"]!="submitted-data"||r["targetRevision"]!="1"||r["frameId"]!="0") fail("unsupported-action-binding");
 if(!matches(r["scope"].toString(),r["url"].toString())) fail("outside-scope");
}
void Core::validateRequest(const QJsonObject &request) { validate(request); }
void Core::sql(const QString &statement) { QSqlQuery q(db); if(!q.exec(statement)) fail(q.lastError().text()); }
Core::Core(const QString &path):session(QUuid::createUuid().toString(QUuid::WithoutBraces)) {
 db=QSqlDatabase::addDatabase("QSQLITE",session); db.setDatabaseName(path); if(!db.open()) fail("store-unavailable");
 sql("PRAGMA journal_mode=WAL"); sql("PRAGMA synchronous=FULL"); sql("PRAGMA busy_timeout=5000");
 sql("CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, scope TEXT NOT NULL, generation INTEGER NOT NULL, enabled INTEGER NOT NULL)");
 sql("CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY, project TEXT NOT NULL, request TEXT NOT NULL, digest TEXT NOT NULL, generation INTEGER NOT NULL, expires INTEGER NOT NULL, session TEXT NOT NULL, consumed INTEGER NOT NULL DEFAULT 0)");
 sql("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, project TEXT NOT NULL, request TEXT NOT NULL, digest TEXT NOT NULL, state TEXT NOT NULL, generation INTEGER NOT NULL, result TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, phase TEXT NOT NULL, UNIQUE(project,request))");
 sql("UPDATE jobs SET state='interrupted',phase='restart-reconciliation-required' WHERE state IN ('running','cancellation-requested','cancellation-accepted','reconciling')");
}
Core::~Core() { auto name=db.connectionName(); db.close(); db=QSqlDatabase(); QSqlDatabase::removeDatabase(name); }
void Core::enableProject(const QString &project,const QString &scope) {
 if(project.isEmpty()||project.size()>2048) fail("project-bound"); parseScope(scope);
 QSqlQuery q(db); q.prepare("INSERT INTO projects VALUES(?,?,1,1) ON CONFLICT(id) DO UPDATE SET scope=excluded.scope,generation=generation+1,enabled=1"); q.addBindValue(project); q.addBindValue(scope); run(q);
}
void Core::revoke(const QString &project) {
 sql("BEGIN IMMEDIATE");
 try { QSqlQuery q(db); q.prepare("UPDATE projects SET generation=generation+1,enabled=0 WHERE id=?"); q.addBindValue(project); run(q);
 q.prepare("UPDATE jobs SET state='cancellation-requested',phase='revoked-before-execution' WHERE project=? AND state='accepted'"); q.addBindValue(project); run(q); sql("COMMIT");
 } catch(...) { sql("ROLLBACK"); throw; }
}
QString Core::review(const QJsonObject &request,int lifetimeSeconds) {
 validate(request); if(lifetimeSeconds<1||lifetimeSeconds>600) fail("review-lifetime");
 QSqlQuery q(db); q.prepare("SELECT scope,generation,enabled FROM projects WHERE id=?"); q.addBindValue(request["projectId"].toString()); run(q);
 if(!q.next()||!q.value(2).toBool()||q.value(0).toString()!=request["scope"].toString()||q.value(1).toInt()!=request["grantGeneration"].toInt()) fail("grant-stale");
 auto id=QUuid::createUuid().toString(QUuid::WithoutBraces);
 q.prepare("INSERT INTO reviews(id,project,request,digest,generation,expires,session) VALUES(?,?,?,?,?,?,?)");
 q.addBindValue(id); q.addBindValue(request["projectId"].toString()); q.addBindValue(request["requestId"].toString()); q.addBindValue(digest(request)); q.addBindValue(request["grantGeneration"].toInt()); q.addBindValue(QDateTime::currentSecsSinceEpoch()+lifetimeSeconds); q.addBindValue(session); run(q); return id;
}
QJsonObject Core::accept(const QJsonObject &request,const QString &reviewId) {
 validate(request); auto project=request["projectId"].toString(),rid=request["requestId"].toString(),hash=digest(request);
 sql("BEGIN IMMEDIATE");
 try {
  QSqlQuery q(db); q.prepare("SELECT scope,generation,enabled FROM projects WHERE id=?"); q.addBindValue(project); run(q);
  if(!q.next()||!q.value(2).toBool()||q.value(0).toString()!=request["scope"].toString()||q.value(1).toInt()!=request["grantGeneration"].toInt()) fail("grant-stale");
  q.prepare("SELECT digest,created FROM jobs WHERE project=? AND request=?"); q.addBindValue(project); q.addBindValue(rid); run(q);
  if(q.next()) { if(q.value(0).toString()!=hash) fail("request-digest-mismatch"); if(q.value(1).toLongLong()+86400<QDateTime::currentSecsSinceEpoch()) fail("request-stale"); sql("COMMIT"); return query(project,rid); }
  q.prepare("SELECT project,request,digest,generation,expires,session,consumed FROM reviews WHERE id=?"); q.addBindValue(reviewId); run(q);
  if(!q.next()||q.value(0).toString()!=project||q.value(1).toString()!=rid||q.value(2).toString()!=hash||q.value(3).toInt()!=request["grantGeneration"].toInt()||q.value(4).toLongLong()<=QDateTime::currentSecsSinceEpoch()||q.value(5).toString()!=session||q.value(6).toBool()) fail("review-invalid");
  q.prepare("UPDATE reviews SET consumed=1 WHERE id=? AND consumed=0"); q.addBindValue(reviewId); run(q); if(q.numRowsAffected()!=1) fail("review-consumed");
  q.prepare("INSERT INTO jobs(id,project,request,digest,state,generation,created,phase) VALUES(?,?,?,?,'accepted',?,?,'accepted-no-effects')"); q.addBindValue(QUuid::createUuid().toString(QUuid::WithoutBraces)); q.addBindValue(project); q.addBindValue(rid); q.addBindValue(hash); q.addBindValue(request["grantGeneration"].toInt()); q.addBindValue(QDateTime::currentSecsSinceEpoch()); run(q);
  sql("COMMIT"); return query(project,rid);
 } catch(...) { sql("ROLLBACK"); throw; }
}
QJsonObject Core::query(const QString &project,const QString &requestId) {
 QSqlQuery q(db); q.prepare("SELECT j.id,j.state,j.result,j.phase FROM jobs j JOIN projects p ON p.id=j.project WHERE j.project=? AND j.request=? AND p.enabled=1"); q.addBindValue(project); q.addBindValue(requestId); run(q);
 if(!q.next()) return {{"state","unknown"}};
 return {{"jobId",q.value(0).toString()},{"state",q.value(1).toString()},{"result",q.value(2).toString()},{"phase",q.value(3).toString()}};
}
QJsonObject Core::cancel(const QString &project,const QString &requestId) {
 QSqlQuery q(db); q.prepare("UPDATE jobs SET state='cancelled',phase='cancelled-before-effects' WHERE project=? AND request=? AND state IN ('accepted','cancellation-requested') AND EXISTS(SELECT 1 FROM projects WHERE id=? AND enabled=1)"); q.addBindValue(project); q.addBindValue(requestId); q.addBindValue(project); run(q); return query(project,requestId);
}
QJsonObject Core::execute(const QJsonObject &request) {
 validate(request); auto project=request["projectId"].toString(),rid=request["requestId"].toString();
 sql("BEGIN IMMEDIATE");
 try {
  QSqlQuery q(db); q.prepare("SELECT j.digest,j.state,j.generation,p.generation,p.enabled,p.scope FROM jobs j JOIN projects p ON p.id=j.project WHERE j.project=? AND j.request=?"); q.addBindValue(project); q.addBindValue(rid); run(q);
  if(!q.next()||q.value(0).toString()!=digest(request)) fail("execution-digest-mismatch");
  if(q.value(1).toString()!="accepted") fail("execution-state");
  if(q.value(2)!=q.value(3)||!q.value(4).toBool()||q.value(5).toString()!=request["scope"].toString()) fail("execution-grant-stale");
  q.prepare("UPDATE jobs SET state='running',phase='hashing-owned-input' WHERE project=? AND request=?"); q.addBindValue(project); q.addBindValue(rid); run(q); sql("COMMIT");
 } catch(...) { sql("ROLLBACK"); throw; }
 auto result=QString::fromLatin1(QCryptographicHash::hash(request["text"].toString().toUtf8(),QCryptographicHash::Sha256).toHex());
 QSqlQuery q(db); q.prepare("UPDATE jobs SET state='succeeded',phase='hash-complete',result=? WHERE project=? AND request=? AND state='running'"); q.addBindValue(result); q.addBindValue(project); q.addBindValue(rid); run(q); return query(project,rid);
}
}
