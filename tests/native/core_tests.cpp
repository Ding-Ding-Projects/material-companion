#include "core.h"
#include "protocol.h"
#include <QCoreApplication>
#include <QTemporaryDir>
#include <QThread>
#include <QFile>
#include <QSqlQuery>
#include <cstdio>
#include <stdexcept>
static int count=0;
static void check(bool value) { ++count; if(!value) throw std::runtime_error("assertion-failed"); }
template<class F> void rejects(F f) { bool rejected=false; try { f(); } catch(...) { rejected=true; } check(rejected); }
int main(int argc,char **argv) {
 QCoreApplication app(argc,argv);
 try {
  using namespace companion;
  check(matches("https://EXAMPLE.com:443/project","https://example.com/project/docs"));
  check(!matches("https://example.com/project","https://example.com/projects"));
  check(!matches("https://example.com/project","https://example.com:444/project"));
  for(const auto &path:QStringList{"/%2fsecret","/%5csecret","/%2e%2e/secret","/%252fsecret","//secret","/%ff","/%xx","/../secret"}) rejects([&]{parseScope("https://example.com"+path);});
  rejects([]{parseScope("https://example.com./project");});
  rejects([]{parseScope("https://user@example.com/project");});
  rejects([]{parseEnvelope("{\"version\":1,\"version\":1}");});
  rejects([]{parseEnvelope("{\"method\":\"query\",\"request\":{},\"version\":2}");});
  rejects([]{parseEnvelope("{\"method\":\"approve\",\"request\":{},\"version\":1}");});
  QTemporaryDir temp; check(temp.isValid()); auto path=temp.path()+"/jobs.db";
  QJsonObject r{{"requestId","r1"},{"projectId","p1"},{"scope","https://example.com/project"},{"url","https://example.com/project/docs"},{"adapterVersion","1"},{"actionId","text.sha256"},{"text","abc"},{"targetId","submitted-data"},{"targetRevision","1"},{"documentId","d1"},{"tabId","1"},{"frameId","0"},{"grantGeneration",1}};
  QString job,oldReview;
  {
   Core core(path); core.enableProject("p1",r["scope"].toString());
   rejects([&]{core.accept(r,"page-consent");});
   auto review=core.review(r); auto accepted=core.accept(r,review); job=accepted["jobId"].toString(); check(!job.isEmpty()); check(accepted["state"]=="accepted");
   check(core.accept(r,review)["jobId"].toString()==job);
   auto changed=r; changed["text"]="other"; rejects([&]{core.accept(changed,review);});
   auto reused=r; reused["requestId"]="r2"; rejects([&]{core.accept(reused,review);});
   check(core.execute(r)["result"]=="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
   rejects([&]{core.execute(r);});
   check(core.query("other","r1")["state"]=="unknown");
   r["requestId"]="r2"; auto pending=core.review(r); core.revoke("p1"); rejects([&]{core.accept(r,pending);});
   core.enableProject("p1",r["scope"].toString()); r["grantGeneration"]=3;
   auto expired=core.review(r,1); QThread::msleep(1100); rejects([&]{core.accept(r,expired);});
   auto rv=core.review(r); core.accept(r,rv); check(core.cancel("p1","r2")["state"]=="cancelled"); rejects([&]{core.execute(r);});
   r["requestId"]="r3"; auto rr=core.review(r); core.accept(r,rr);
   { QSqlQuery fixture(QSqlDatabase::database(QSqlDatabase::connectionNames().last())); check(fixture.exec("UPDATE jobs SET state='running' WHERE request='r3'")); }
   rejects([&]{Core overlapping(path);}); check(core.query("p1","r3")["state"]=="running");
   { QSqlQuery fixture(QSqlDatabase::database(QSqlDatabase::connectionNames().last())); check(fixture.exec("UPDATE jobs SET state='accepted' WHERE request='r3'")); }
   check(core.listJobs(1).size()==1); rejects([&]{core.listJobs(1001);});
   auto pendingRequest=r; pendingRequest["requestId"]="r4"; oldReview=core.review(pendingRequest);
  }
  {
   Core core(path); check(core.query("p1","r1")["jobId"].toString()==job); check(core.query("p1","r3")["state"]=="interrupted");
   check(core.query("p1","r3")["phase"]=="reviewed-input-unavailable-new-review-required");
   check(core.accept(r,"old-session")["state"]=="interrupted"); rejects([&]{core.execute(r);});
   r["requestId"]="r4"; rejects([&]{core.accept(r,oldReview);});
   auto review=core.review(r); core.accept(r,review); core.revoke("p1"); rejects([&]{core.execute(r);});
   bool retained=false; for(const auto &entry:core.listJobs()) if(entry.toObject()["requestId"]=="r4") { retained=true; check(entry.toObject()["state"]=="cancelled"); check(entry.toObject()["phase"]=="revoked-before-execution-no-effects"); } check(retained);
   // The test-only target releases its real lease. Production has no release
   // API and Windows can prevent deletion of an actively held lock file.
   core.releaseOwnershipForTest(); rejects([&]{core.listJobs();});
  }
  printf("PASS %d native contract assertions\n",count); return 0;
 } catch(const std::exception &e) { fprintf(stderr,"FAIL %s after %d assertions\n",e.what(),count); return 1; }
}
