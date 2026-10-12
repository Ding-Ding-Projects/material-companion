#pragma once
#include <QJsonObject>
#include <QString>
namespace companion {
constexpr int ProtocolVersion = 1;
constexpr qsizetype MaximumMessage = 262144;
struct Scope { QString origin; QStringList segments; };
Scope parseScope(const QString &url);
bool matches(const QString &scope, const QString &candidate);
QJsonObject parseEnvelope(const QByteArray &bytes);
QByteArray canonical(const QJsonObject &object);
QString digest(const QJsonObject &object);
QString currentUser();
QString endpoint();
bool pipeOwnedByCurrentUser(quintptr handle);
}
