'use client';

import Link from 'next/link';
import { useGlobalSettings } from '@/app/lib/useGlobalSettings';
import { ArrowLeft, Users, Settings, Mail, FileText, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function StaffInstructions() {
  const globalSettings = useGlobalSettings();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/instructions" className="inline-flex items-center text-blue-600 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zur Benutzer-Anleitung
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zum Dashboard
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Anleitung für Sachbearbeiter & Admins</h1>
          <p className="text-lg text-gray-600">Vollständige Dokumentation für die Verwaltung des Krankmeldungssystems</p>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <a href="#dashboard" className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition cursor-pointer">
            <FileText className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Dashboard</h3>
            <p className="text-sm text-gray-600">Übersicht & Statistiken</p>
          </a>
          <a href="#settings" className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition cursor-pointer">
            <Settings className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Einstellungen</h3>
            <p className="text-sm text-gray-600">System konfigurieren</p>
          </a>
          <a href="#submissions" className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition cursor-pointer">
            <CheckCircle className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Meldungen</h3>
            <p className="text-sm text-gray-600">Verwaltung & Verarbeitung</p>
          </a>
          <a href="#email" className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition cursor-pointer">
            <Mail className="w-6 h-6 text-orange-600 mb-2" />
            <h3 className="font-semibold text-gray-900">E-Mails</h3>
            <p className="text-sm text-gray-600">E-Mail-Konfiguration</p>
          </a>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Dashboard Section */}
          <section id="dashboard" className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Dashboard – Übersicht & Statistiken</h2>
            </div>

            <div className="prose max-w-none space-y-4 text-gray-700">
              <p>
                Das Dashboard ist die zentrale Anlaufstelle für alle administrativen Funktionen. Nach dem Login als Sachbearbeiter oder Admin sehen Sie umfangreiche Statistiken zu allen Krankmeldungen.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">Hauptbereiche:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Statistik-Karten:</strong> Zeigen die Anzahl der Gesamtmeldungen, heutige Meldungen, Meldungen dieser Woche und diesen Monat</li>
                <li><strong>Anwender-Feedback:</strong> Durchschnittliche Bewertung und Verteilung der Stern-Ratings von Bürgern</li>
                <li><strong>Meldungen nach Typ:</strong> Visualisierung der Verteilung (AUS-CARE, Kinderbetreuung, EAU, Einfach)</li>
                <li><strong>Meldungen nach Status:</strong> Übersicht über laufende, akzeptierte und abgelehnte Meldungen</li>
                <li><strong>Top 10 Arbeitgeber:</strong> Liste der häufigsten Arbeitgeber mit Meldungsanzahl</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">Anmelden bleiben:</h3>
              <p>
                Aktivieren Sie die Option „Angemeldet bleiben" bei der Anmeldung, um automatisch eingeloggt zu bleiben und nicht nach jeder Sitzung erneut anmelden zu müssen.
              </p>
            </div>
          </section>

          {/* Submissions Section */}
          <section id="submissions" className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Meldungen – Verwaltung & Verarbeitung</h2>
            </div>

            <div className="prose max-w-none space-y-4 text-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 mt-0">Meldungen anzeigen:</h3>
              <p>
                Im Reiter „Meldungen" im Dashboard sehen Sie alle eingereichten Krankmeldungen. Sie können diese filtern nach:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Status (Laufend, Akzeptiert, Abgelehnt)</li>
                <li>Arbeitgeber</li>
                <li>Zeitraum (heute, diese Woche, dieser Monat, benutzerdefiniert)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">Meldung bearbeiten:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Klicken Sie auf eine Meldung in der Liste</li>
                <li>Überprüfen Sie alle Daten (Name, Arbeitgeber, Krankheitstyp, Zeitraum)</li>
                <li>Tätigen Sie Anpassungen falls notwendig</li>
                <li>Laden Sie angehängte Dateien herunter oder löschen Sie diese</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">Status ändern:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Akzeptiert:</strong> Meldung wird genehmigt, E-Mail wird an Arbeitgeber gesendet</li>
                <li><strong>Abgelehnt:</strong> Meldung wird abgelehnt, Benachrichtigung wird versendet</li>
                <li><strong>Archivieren:</strong> Alte Meldungen in das Archiv verschieben</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">PDF-Export:</h3>
              <p>
                Generieren Sie jederzeit eine PDF-Version einer Meldung. Diese enthält alle relevanten Informationen und kann ausgedruckt oder gespeichert werden.
              </p>
            </div>
          </section>

          {/* Settings Section */}
          <section id="settings" className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Einstellungen – System konfigurieren</h2>
            </div>

            <div className="prose max-w-none space-y-4 text-gray-700">
              <p>
                Im Reiter „Einstellungen" im Dashboard können Sie alle systemweit gültigen Konfigurationen anpassen.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">Globale Einstellungen:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>App-Name:</strong> Der Name des Systems (wird überall angezeigt)</li>
                <li><strong>App-Slogan:</strong> Ein kurzes Motto oder eine Beschreibung</li>
                <li><strong>Admin-Passwort:</strong> Das Passwort für den Admin-Zugang (Nur Admins können dies ändern)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">E-Mail-Einstellungen:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>SMTP-Host:</strong> Der E-Mail-Server (z.B. mail.example.com)</li>
                <li><strong>SMTP-Port:</strong> Der Port des E-Mail-Servers (normalerweise 587 oder 465)</li>
                <li><strong>SMTP-Benutzer:</strong> Benutzername für die Authentifizierung</li>
                <li><strong>SMTP-Passwort:</strong> Passwort für die Authentifizierung</li>
                <li><strong>Absender-E-Mail:</strong> Die E-Mail-Adresse, von der E-Mails versendet werden</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">Arbeitgeber verwalten:</h3>
              <p>
                Der Reiter „Arbeitgeber" zeigt alle registrierten Arbeitgeber und deren E-Mail-Adressen. Sie können:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Neue Arbeitgeber hinzufügen</li>
                <li>E-Mail-Adressen bearbeiten</li>
                <li>Arbeitgeber deaktivieren oder löschen</li>
              </ul>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <strong>Tipp:</strong> Änderungen an den Einstellungen werden sofort wirksam. Bei E-Mail-Einstellungen sollten Sie diese mit dem Test-Button überprüfen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Email Section */}
          <section id="email" className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">E-Mail-System – Konfiguration & Logging</h2>
            </div>

            <div className="prose max-w-none space-y-4 text-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 mt-0">E-Mail-Versand:</h3>
              <p>
                Das System versendet automatisch E-Mails in folgenden Situationen:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Meldung akzeptiert: Benachrichtigung an Arbeitgeber</li>
                <li>Meldung abgelehnt: Benachrichtigung an den Benutzer</li>
                <li>Meldung eingereicht: Bestätigung an den Benutzer</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">E-Mail-Konfiguration testen:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Gehen Sie zu „Einstellungen" → „E-Mail"</li>
                <li>Tragen Sie die SMTP-Daten ein</li>
                <li>Klicken Sie auf den „Test-E-Mail-Versand" Button</li>
                <li>Überprüfen Sie Ihr E-Mail-Postfach</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">E-Mail-Audit-Log:</h3>
              <p>
                Im Reiter „Debug" finden Sie ein Audit-Log aller versendeten E-Mails mit Timestamps und Status. Dies hilft bei der Fehlersuche, wenn E-Mails nicht ankommen.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    <strong>Hinweis:</strong> E-Mail-Einstellungen werden zunächst aus der Datenbank geladen. Falls nicht konfiguriert, wird auf die Umgebungsvariablen (.env) zurückgegriffen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Sicherheit & Best Practices</h2>
            </div>

            <div className="prose max-w-none space-y-4 text-gray-700">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Passwörter:</strong> Verwenden Sie starke, eindeutige Passwörter (mind. 12 Zeichen, Großbuchstaben, Zahlen, Sonderzeichen)</li>
                <li><strong>Logout:</strong> Melden Sie sich ab, wenn Sie Ihren Arbeitsplatz verlassen</li>
                <li><strong>Automatisches Logout:</strong> Nach 30 Minuten Inaktivität werden Sie automatisch abgemeldet</li>
                <li><strong>Sichere SMTP:</strong> Verwenden Sie TLS/SSL für den E-Mail-Versand (Port 587 oder 465)</li>
                <li><strong>Audit-Log:</strong> Alle wichtigen Aktionen werden protokolliert</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">Rollen & Berechtigungen:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Sachbearbeiter:</strong> Kann Meldungen einsehen, Status ändern, PDF exportieren</li>
                <li><strong>Admin:</strong> Vollständiger Zugriff auf alle Einstellungen, Arbeitgeber, E-Mail-Konfiguration und Audit-Logs</li>
              </ul>
            </div>
          </section>

          {/* Support Section */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hilfe & Support</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Probleme bei der Anmeldung?</strong> Vergewissern Sie sich, dass Sie das korrekte Passwort verwenden. Wenden Sie sich an den Administrator, wenn Sie Ihr Passwort vergessen haben.
              </p>
              <p>
                <strong>E-Mails werden nicht versendet?</strong> Überprüfen Sie die SMTP-Einstellungen im Debug-Bereich und testen Sie den E-Mail-Versand.
              </p>
              <p>
                <strong>Weitere Fragen?</strong> Konsultieren Sie die{' '}
                <Link href="/instructions" className="text-blue-600 hover:text-blue-700 underline">
                  Benutzer-Anleitung
                </Link>{' '}
                oder kontaktieren Sie Ihren Administrator.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>{globalSettings.appName} – {globalSettings.appSlogan} • v10.02 • 20.02.2026</p>
          <p className="mt-2">
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Zur Startseite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
