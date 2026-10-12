#include "workspace.h"
#include <QStandardPaths>
#include <QDir>
#include <QJsonDocument>
#include <QJsonArray>
#include <QFile>
#include <QUrl>
#include <QUuid>
#include <QTimer>
Workspace::Workspace(QObject *parent):QObject(parent){
 auto path=QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation); QDir().mkpath(path);
 m_core=std::make_unique<companion::Core>(path+"/operations.sqlite");
 m_projects=m_store.value("projects").toList(); m_jobs=m_store.value("jobs").toList();
}
QVariantList Workspace::projects()const{return m_projects;}
QVariantList Workspace::operations()const{
 QVariantList result;
 for(auto v:m_jobs){auto ids=v.toMap(); auto record=m_core->query(ids["projectId"].toString(),ids["requestId"].toString()).toVariantMap(); record.insert("projectId",ids["projectId"]); result.append(record);}
 return result;
}
QVariantMap Workspace::settings()const{
 return {{"language",m_store.value("language",0)},{"dark",m_store.value("dark",false)},{"reducedMotion",m_store.value("reducedMotion",true)},{"englishHumor",m_store.value("englishHumor",0)},{"cantoneseHumor",m_store.value("cantoneseHumor",0)},{"tab",m_store.value("tab",0)},{"vocabularyLoaded",!m_words.isEmpty()}};
}
void Workspace::notify(QString text){m_notice=text;emit changed();}
void Workspace::createProject(QString name,QString scope){
 QUrl url(scope); name=name.trimmed();
 if(name.isEmpty()||name.size()>100||!url.isValid()||url.scheme()!="https"||url.host().isEmpty()||!url.userInfo().isEmpty()||url.hasQuery()||url.hasFragment()){notify("Enter a name and an exact HTTPS origin/path without credentials, query or fragment.");return;}
 auto id=QUuid::createUuid().toString(QUuid::WithoutBraces); m_core->enableProject(id,scope);

 m_projects.append(QVariantMap{{"id",id},{"name",name},{"scope",scope},{"generation",1},{"enabled",true}});
 m_store.setValue("projects",m_projects);notify("Project created with an explicit local grant.");
}
void Workspace::revoke(QString project){
 m_core->revoke(project); for(auto &v:m_projects){auto p=v.toMap();if(p["id"]==project){p["enabled"]=false;v=p;}}
 m_request={};m_review.clear();m_store.setValue("projects",m_projects);notify("Grant revoked. Pending review withdrawn.");
}
void Workspace::prepare(QString project,QString text){
 if(m_busy)return;
 if(text.toUtf8().size()>65536){notify("Text exceeds the 64 KiB limit.");return;}
 QVariantMap p;for(auto v:m_projects)if(v.toMap()["id"]==project)p=v.toMap();
 if(p.isEmpty()||!p["enabled"].toBool()){notify("Select a project with an active grant.");return;}
 m_request={{"requestId",QUuid::createUuid().toString(QUuid::WithoutBraces)},{"projectId",project},{"scope",p["scope"].toString()},{"url",p["scope"].toString()},{"adapterVersion","1"},{"actionId","text.sha256"},{"text",text},{"targetId","submitted-data"},{"targetRevision","1"},{"documentId","native-editor"},{"tabId","native-tools"},{"frameId","0"},{"grantGeneration",p["generation"].toInt()}};
 m_review=m_core->review(m_request);notify(m_review.isEmpty()?"Review rejected. Check grant and request conditions.":"Review prepared. Content stays in memory and is not stored in history.");
}
QString Workspace::reviewSummary()const{
 if(m_review.isEmpty())return {};
 return QString("SHA-256 of %1 UTF-8 bytes\nProject: %2\nScope: %3\nNo file changes. Text is not persisted. Review expires after 120 seconds.").arg(m_request["text"].toString().toUtf8().size()).arg(m_request["projectId"].toString(),m_request["scope"].toString());
}
void Workspace::authorize(){
 if(m_busy||m_review.isEmpty())return;m_busy=true;emit changed();
 QTimer::singleShot(0,this,[this]{auto result=m_core->accept(m_request,m_review);
 if(!result["jobId"].toString().isEmpty()){m_jobs.append(QVariantMap{{"projectId",m_request["projectId"].toString()},{"requestId",m_request["requestId"].toString()}});m_store.setValue("jobs",m_jobs);}
 m_request={};m_review.clear();m_busy=false;notify(QJsonDocument(result).toJson(QJsonDocument::Compact));});
}
void Workspace::dismissReview(){if(!m_busy){m_request={};m_review.clear();notify("Review dismissed. Nothing executed.");}}
void Workspace::setSetting(QString key,QVariant value){
 if(key=="language"||key=="tab"||key=="englishHumor"||key=="cantoneseHumor"){int n=value.toInt();if(n<0||n>(key=="language"?2:key=="tab"?4:10))return;value=n;}
 else if(key=="dark"||key=="reducedMotion")value=value.toBool();else return;
 m_store.setValue(key,value);emit changed();
}
QString Workspace::label(QString en,QString zh)const{
 QString out;int language=m_store.value("language",0).toInt();out=language==1?zh:language==2?en+" / "+zh:en;
 for(auto it=m_words.cbegin();it!=m_words.cend();++it)out.replace(it.key(),it.value());return out;
}
void Workspace::loadVocabulary(QUrl url){
 QFile f(url.toLocalFile());if(!url.isLocalFile()||!f.open(QIODevice::ReadOnly)||f.size()>262144){notify("Vocabulary file unavailable or too large.");return;}
 QJsonParseError error;auto doc=QJsonDocument::fromJson(f.readAll(),&error);auto root=doc.object();
 if(error.error!=QJsonParseError::NoError||root.size()!=2||root["version"].toInt()!=1||!root["entries"].isArray()){notify("Invalid vocabulary schema. Current wording retained.");return;}
 QHash<QString,QString> words;auto entries=root["entries"].toArray();if(entries.size()>1000){notify("Too many entries.");return;}
 for(auto v:entries){auto e=v.toObject();auto from=e["from"].toString(),to=e["to"].toString();if(e.size()!=2||from.isEmpty()||to.isEmpty()||from.size()>100||to.size()>200||words.contains(from)||from.contains(QChar::Null)||to.contains(QChar::Null)){notify("Invalid vocabulary entry. Current wording retained.");return;}words.insert(from,to);}
 m_words=words;notify("Local presentation wording loaded for this session only.");
}
void Workspace::clearVocabulary(){m_words.clear();notify("Original wording restored.");}
