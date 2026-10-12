#pragma once
#include <QObject>
#include <QSettings>
#include <QVariantList>
#include <QJsonObject>
#include <QUrl>
#include <memory>
#include "core.h"
class Workspace final : public QObject {
 Q_OBJECT
 Q_PROPERTY(QVariantList projects READ projects NOTIFY changed)
 Q_PROPERTY(QVariantList operations READ operations NOTIFY changed)
 Q_PROPERTY(QVariantMap settings READ settings NOTIFY changed)
 Q_PROPERTY(QString notice READ notice NOTIFY changed)
 Q_PROPERTY(bool busy READ busy NOTIFY changed)
 Q_PROPERTY(QString reviewSummary READ reviewSummary NOTIFY changed)
public:
 explicit Workspace(QObject *parent=nullptr, QString dataRoot={});
 QVariantList projects() const; QVariantList operations() const;
 QVariantMap settings() const; QString notice()const{return m_notice;}
 bool busy()const{return m_busy;} QString reviewSummary()const;
 Q_INVOKABLE void createProject(QString name,QString scope);
 Q_INVOKABLE void revoke(QString project);
 Q_INVOKABLE void prepare(QString project,QString text);
 Q_INVOKABLE void authorize(); Q_INVOKABLE void dismissReview();
 Q_INVOKABLE void dismissNotice(){m_notice.clear();emit changed();}
 Q_INVOKABLE void setSetting(QString key,QVariant value);
 Q_INVOKABLE QString label(QString en,QString zh)const;
 Q_INVOKABLE QString humorCopy()const;
 Q_INVOKABLE void loadVocabulary(QUrl url); Q_INVOKABLE void clearVocabulary();
signals: void changed();
private:
 void notify(QString text); void refreshOperations(); void failure(QString operation);
 QSettings m_store;
 std::unique_ptr<companion::Core> m_core; QVariantList m_projects,m_operations;
 QJsonObject m_request; QString m_review,m_notice; bool m_busy=false;
 QHash<QString,QString> m_words;
};
