#include "protocol.h"
#include <QCryptographicHash>
#include <QJsonDocument>
#include <QUrl>
#include <QRegularExpression>
#include <QStringDecoder>
#include <stdexcept>
#ifdef Q_OS_WIN
#include <windows.h>
#include <sddl.h>
#include <aclapi.h>
#endif
namespace companion {
static void reject(const char *s) { throw std::runtime_error(s); }
Scope parseScope(const QString &text) {
 if(text.contains(QRegularExpression("[\\x00-\\x20\\\\]"))) reject("invalid-url-character");
 auto start=text.indexOf("://"); if(start<0) reject("invalid-origin");
 auto slash=text.indexOf('/',start+3); QString raw=slash<0?QString("/"):text.mid(slash).section('?',0,0).section('#',0,0);
 if(raw.contains("//")) reject("repeated-separator");
 if(raw.contains(QRegularExpression("%(?![0-9A-Fa-f]{2})"))) reject("malformed-escape");
 if(raw.contains(QRegularExpression("%(?:2f|5c|25|0[0-9a-f]|1[0-9a-f]|7f)",QRegularExpression::CaseInsensitiveOption))) reject("unsafe-escape");
 QStringList segments;
 for(const auto &part:raw.split('/',Qt::SkipEmptyParts)) {
  auto bytes=QByteArray::fromPercentEncoding(part.toUtf8()); QStringDecoder decoder(QStringDecoder::Utf8); QString decoded=decoder(bytes);
  if(decoder.hasError()||decoded=="."||decoded=="..") reject("ambiguous-path");
  segments<<decoded;
 }
 QUrl url(text,QUrl::StrictMode);
 if(!url.isValid()||url.scheme()!="https"||url.host().isEmpty()||url.host().endsWith('.')||!url.userInfo().isEmpty()||url.host().contains('*')) reject("invalid-origin");
 QString origin="https://"+QString::fromLatin1(QUrl::toAce(url.host()));
 if(url.port(443)!=443) origin+=":"+QString::number(url.port());
 return {origin,segments};
}
bool matches(const QString &scope,const QString &candidate) {
 auto a=parseScope(scope),b=parseScope(candidate); if(a.origin!=b.origin||a.segments.size()>b.segments.size()) return false;
 for(int i=0;i<a.segments.size();++i) if(a.segments[i]!=b.segments[i]) return false;
 return true;
}
QByteArray canonical(const QJsonObject &object) { return QJsonDocument(object).toJson(QJsonDocument::Compact); }
QString digest(const QJsonObject &object) { return QString::fromLatin1(QCryptographicHash::hash(canonical(object),QCryptographicHash::Sha256).toHex()); }
QJsonObject parseEnvelope(const QByteArray &bytes) {
 if(bytes.isEmpty()||bytes.size()>MaximumMessage) reject("message-size");
 QJsonParseError error; auto doc=QJsonDocument::fromJson(bytes,&error);
 if(error.error!=QJsonParseError::NoError||!doc.isObject()) reject("invalid-json");
 auto o=doc.object();
 // Wire format is canonical byte-for-byte. This also rejects duplicate keys,
 // alternative number representations and unknown whitespace before hashing.
 if(canonical(o)!=bytes) reject("noncanonical-json");
 if(o.value("version").toInt(-1)!=ProtocolVersion) reject("unsupported-version");
 const QStringList allowed={"version","method","request"};
 for(auto it=o.begin();it!=o.end();++it) if(!allowed.contains(it.key())) reject("unknown-field");
 if(!o.value("method").isString()||!o.value("request").isObject()) reject("invalid-envelope");
 if(!QStringList{"hello","submit","query","cancel"}.contains(o.value("method").toString())) reject("unsupported-method");
 return o;
}
QString currentUser() {
#ifdef Q_OS_WIN
 HANDLE token=nullptr; if(!OpenProcessToken(GetCurrentProcess(),TOKEN_QUERY,&token)) reject("user-proof");
 DWORD size=0; GetTokenInformation(token,TokenUser,nullptr,0,&size); QByteArray data(size,0);
 if(!GetTokenInformation(token,TokenUser,data.data(),size,&size)) { CloseHandle(token); reject("user-proof"); }
 CloseHandle(token); LPWSTR sid=nullptr; if(!ConvertSidToStringSidW(reinterpret_cast<TOKEN_USER*>(data.data())->User.Sid,&sid)) reject("user-proof");
 QString value=QString::fromWCharArray(sid); LocalFree(sid); return value;
#else
 reject("unsupported-platform"); return {};
#endif
}
QString endpoint() { return "material-companion-"+QString::fromLatin1(QCryptographicHash::hash(currentUser().toUtf8(),QCryptographicHash::Sha256).toHex()); }
bool pipeOwnedByCurrentUser(quintptr handle) {
#ifdef Q_OS_WIN
 PSID owner=nullptr; PSECURITY_DESCRIPTOR descriptor=nullptr;
 auto result=GetSecurityInfo(reinterpret_cast<HANDLE>(handle),SE_KERNEL_OBJECT,OWNER_SECURITY_INFORMATION,&owner,nullptr,nullptr,nullptr,&descriptor);
 if(result!=ERROR_SUCCESS) return false;
 LPWSTR value=nullptr; bool ok=ConvertSidToStringSidW(owner,&value)&&QString::fromWCharArray(value)==currentUser();
 if(value) LocalFree(value); if(descriptor) LocalFree(descriptor); return ok;
#else
 Q_UNUSED(handle); return false;
#endif
}
}
