#include "workspace.h"
#include <QStandardPaths>
#include <QDir>
#include <QJsonDocument>
#include <QJsonArray>
#include <QFile>
#include <QUrl>
#include <QUuid>
#include <QTimer>
#include <stdexcept>
Workspace::Workspace(QObject *parent, QString dataRoot):QObject(parent),m_store((dataRoot.isEmpty()?QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation):dataRoot)+"/settings.ini",QSettings::IniFormat){
 auto path=dataRoot.isEmpty()?QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation):dataRoot;
 try { if(!QDir().mkpath(path))throw std::runtime_error("store-unavailable");
 m_core=std::make_unique<companion::Core>(path+"/operations.sqlite");
 m_projects=m_store.value("projects").toList();refreshOperations();
 } catch(...) {m_core.reset();failure("Open local operation store");}
}
QVariantList Workspace::projects()const{return m_projects;}
QVariantList Workspace::operations()const{
 return m_operations;
}
void Workspace::refreshOperations(){
 if(!m_core)return;
 QVariantList records;
 for(int offset=0;offset<=1000000;offset+=1000){
  const auto page=m_core->listJobs(1000,offset);records.append(page.toVariantList());
  if(page.size()<1000)break;
 }
 m_operations=records;
}
void Workspace::failure(QString operation){
 QString reason="native-validation-or-store-unavailable";
 const QStringList safe={"store-unavailable","request-fields","missing-request-field","request-field-type","grant-generation","field-bound","text-bound","unsupported-action-binding","outside-scope","project-bound","review-lifetime","grant-stale","request-digest-mismatch","request-stale","review-invalid","review-consumed","execution-digest-mismatch","execution-state","execution-grant-stale","accept-rejected"};
 if(std::current_exception()){try{std::rethrow_exception(std::current_exception());}catch(const std::exception &e){QString code=QString::fromUtf8(e.what());if(safe.contains(code))reason=code;}catch(...){}}
 notify(operation+": "+reason+". No success is claimed; inspect durable operation history before retrying.");
}
QVariantMap Workspace::settings()const{
 return {{"language",m_store.value("language",0)},{"dark",m_store.value("dark",false)},{"reducedMotion",m_store.value("reducedMotion",true)},{"englishHumor",qBound(1,m_store.value("englishHumor",5).toInt(),5)},{"cantoneseHumor",qBound(1,m_store.value("cantoneseHumor",5).toInt(),5)},{"tab",m_store.value("tab",0)},{"vocabularyLoaded",!m_words.isEmpty()}};
}
void Workspace::notify(QString text){m_notice=text;emit changed();}
void Workspace::createProject(QString name,QString scope){
 try {if(!m_core){failure("Create project");return;}
 QUrl url(scope); name=name.trimmed();
 if(name.isEmpty()||name.size()>100||!url.isValid()||url.scheme()!="https"||url.host().isEmpty()||!url.userInfo().isEmpty()||url.hasQuery()||url.hasFragment()){notify("Enter a name and an exact HTTPS origin/path without credentials, query or fragment.");return;}
 auto id=QUuid::createUuid().toString(QUuid::WithoutBraces); m_core->enableProject(id,scope);

 m_projects.append(QVariantMap{{"id",id},{"name",name},{"scope",scope},{"generation",1},{"enabled",true}});
 m_store.setValue("projects",m_projects);notify("Project created with an explicit local grant.");
 }catch(...){failure("Create project");}
}
void Workspace::revoke(QString project){
 try {if(!m_core){failure("Revoke grant");return;}
 m_core->revoke(project); for(auto &v:m_projects){auto p=v.toMap();if(p["id"]==project){p["enabled"]=false;v=p;}}
 m_request={};m_review.clear();m_store.setValue("projects",m_projects);notify("Grant revoked. Pending review withdrawn.");
 }catch(...){failure("Revoke grant");}
}
void Workspace::prepare(QString project,QString text){
 try {if(!m_core){failure("Prepare review");return;}
 if(m_busy)return;
 if(text.toUtf8().size()>65536){notify("Text exceeds the 64 KiB limit.");return;}
 QVariantMap p;for(auto v:m_projects)if(v.toMap()["id"]==project)p=v.toMap();
 if(p.isEmpty()||!p["enabled"].toBool()){notify("Select a project with an active grant.");return;}
 m_request={{"requestId",QUuid::createUuid().toString(QUuid::WithoutBraces)},{"projectId",project},{"scope",p["scope"].toString()},{"url",p["scope"].toString()},{"adapterVersion","1"},{"actionId","text.sha256"},{"text",text},{"targetId","submitted-data"},{"targetRevision","1"},{"documentId","native-editor"},{"tabId","native-tools"},{"frameId","0"},{"grantGeneration",p["generation"].toInt()}};
 m_review=m_core->review(m_request);notify(m_review.isEmpty()?"Review rejected. Check grant and request conditions.":"Review prepared. Content stays in memory and is not stored in history.");
 }catch(...){m_request={};m_review.clear();failure("Prepare review");}
}
QString Workspace::reviewSummary()const{
 if(m_review.isEmpty())return {};
 return QString("SHA-256 of %1 UTF-8 bytes\nProject: %2\nScope: %3\nNo file changes. Text is not persisted. Review expires after 120 seconds.").arg(m_request["text"].toString().toUtf8().size()).arg(m_request["projectId"].toString(),m_request["scope"].toString());
}
void Workspace::authorize(){
 if(m_busy||m_review.isEmpty())return;m_busy=true;emit changed();
 const auto request=m_request;const auto review=m_review;
 QTimer::singleShot(0,this,[this,request,review]{
 QString acceptedId;
 try {if(!m_core)throw std::runtime_error("store-unavailable");
 auto accepted=m_core->accept(request,review);acceptedId=accepted["jobId"].toString();
 if(acceptedId.isEmpty())throw std::runtime_error("accept-rejected");
 const auto result=m_core->execute(request);refreshOperations();
 m_request={};m_review.clear();m_busy=false;
 notify("Job "+acceptedId+": "+QJsonDocument(result).toJson(QJsonDocument::Compact));
 }catch(...){m_request={};m_review.clear();m_busy=false;
 try{refreshOperations();}catch(...){}
 failure(acceptedId.isEmpty()?"Authorize operation":"Accepted job "+acceptedId+", execution outcome uncertain");}
 });
}
void Workspace::dismissReview(){if(!m_busy&&!m_review.isEmpty()){m_request={};m_review.clear();notify("Pending review dismissed. Nothing executed by this review.");}}
void Workspace::setSetting(QString key,QVariant value){
 if(key=="language"||key=="tab"||key=="englishHumor"||key=="cantoneseHumor"){int n=value.toInt();bool humor=key.endsWith("Humor");if(n<(humor?1:0)||n>(key=="language"?2:key=="tab"?4:5))return;value=n;}
 else if(key=="dark"||key=="reducedMotion")value=value.toBool();else return;
 m_store.setValue(key,value);emit changed();
}
QString Workspace::label(QString en,QString zh)const{
 QString out;int language=m_store.value("language",0).toInt();out=language==1?zh:language==2?en+" / "+zh:en;
 for(auto it=m_words.cbegin();it!=m_words.cend();++it)out.replace(it.key(),it.value());return out;
}
QString Workspace::humorCopy()const{
 const QStringList en={"Text remains local.","Text remains local. No travel itinerary needed.","Text remains local. The cloud can take a break.","Text remains local. It already has a perfectly good chair here.","Text remains local. Sending it sightseeing would only create paperwork."};
 const QStringList zh={"文字留在本機。","文字留喺本機，唔使訂車票。","文字留喺本機，雲端可以休息。","文字留喺本機，呢度已經有張好椅。","文字留喺本機，送佢去旅行只會多咗手續。"};
 return label(en[settings()["englishHumor"].toInt()-1],zh[settings()["cantoneseHumor"].toInt()-1]);
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
