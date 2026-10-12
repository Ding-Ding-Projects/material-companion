#include <QtTest>
#include <QTemporaryDir>
#include <QFile>
#include <QSettings>
#include <QJsonDocument>
#include "workspace.h"
class WorkspaceTest : public QObject {
 Q_OBJECT
private slots:
 void initTestCase(){QCoreApplication::setOrganizationName("CompanionDesktopTests");QCoreApplication::setApplicationName("WorkspaceTests");}
 void executionAndHistory(){
  QTemporaryDir root;QVERIFY(root.isValid());
  QSettings::setDefaultFormat(QSettings::IniFormat);QSettings::setPath(QSettings::IniFormat,QSettings::UserScope,root.path());
  QSettings().clear();
  {Workspace w(nullptr,root.path());w.createProject("Test","https://example.com/project");QCOMPARE(w.projects().size(),1);
   const auto id=w.projects()[0].toMap()["id"].toString();
   w.prepare(id,"abc");QVERIFY(!w.reviewSummary().isEmpty());w.authorize();QTRY_VERIFY(!w.busy());
   QCOMPARE(w.operations().size(),1);const auto record=w.operations()[0].toMap();QCOMPARE(record["state"].toString(),"succeeded");
   QVERIFY(QJsonDocument::fromVariant(record).toJson().contains("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
   const auto outcome=w.notice();w.dismissReview();QCOMPARE(w.notice(),outcome);
   w.prepare(id,"abc");w.revoke(id);const auto revoked=w.notice();w.dismissReview();QCOMPARE(w.notice(),revoked);
  }
  QSettings().clear();Workspace reopened(nullptr,root.path());QCOMPARE(reopened.operations().size(),1);
 }
 void caughtValidationAndStoreFailure(){
  QTemporaryDir root;QSettings().clear();Workspace w(nullptr,root.path());
  w.createProject("Test","https://example.com/project");const auto id=w.projects()[0].toMap()["id"].toString();
  w.prepare(id,"");QVERIFY(w.notice().contains("request-field-type"));QVERIFY(w.reviewSummary().isEmpty());QVERIFY(!w.busy());
  QFile file(root.path()+"/not-directory");QVERIFY(file.open(QIODevice::WriteOnly));file.write("x");file.close();
  Workspace unavailable(nullptr,file.fileName());QVERIFY(unavailable.notice().contains("store-unavailable"));
  unavailable.createProject("Unavailable","https://example.com/project");QVERIFY(!unavailable.notice().isEmpty());
 }
 void independentHumorAndPresentation(){
  QSettings().clear();QTemporaryDir root;Workspace w(nullptr,root.path());
  QCOMPARE(w.settings()["englishHumor"].toInt(),5);QCOMPARE(w.settings()["cantoneseHumor"].toInt(),5);
  w.setSetting("englishHumor",1);QCOMPARE(w.settings()["cantoneseHumor"].toInt(),5);QCOMPARE(w.humorCopy(),"Text remains local.");
  w.setSetting("englishHumor",0);QCOMPARE(w.settings()["englishHumor"].toInt(),1);
  w.setSetting("language",1);QCOMPARE(w.label("Clear","清除"),QString("清除"));
  QFile mapping(root.path()+"/words.json");QVERIFY(mapping.open(QIODevice::WriteOnly));mapping.write("{\"version\":1,\"entries\":[{\"from\":\"Clear\",\"to\":\"Erase\"}]}");mapping.close();
  w.setSetting("language",0);w.loadVocabulary(QUrl::fromLocalFile(mapping.fileName()));QCOMPARE(w.label("Clear","清除"),QString("Erase"));
  QVERIFY(mapping.open(QIODevice::WriteOnly|QIODevice::Truncate));mapping.write("{}");mapping.close();
  w.loadVocabulary(QUrl::fromLocalFile(mapping.fileName()));QCOMPARE(w.label("Clear","清除"),QString("Erase"));
  w.clearVocabulary();QCOMPARE(w.label("Clear","清除"),QString("Clear"));
 }
};
QTEST_GUILESS_MAIN(WorkspaceTest)
#include "workspace_test.moc"
