'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function InstructionsPage() {
    // Import global settings from DB
    const { appName } = require('@/app/lib/useGlobalSettings').useGlobalSettings();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    try {
      const response = await fetch('/api/cms/content?slug=instructions');
      if (response.ok) {
        const data = await response.json();
        setContent(normalizeInstructionContent(data.content || ''));
      } else {
        // Fallback to default content if not found
        setContent(normalizeInstructionContent(getDefaultContent()));
      }
    } catch (error) {
      console.error('Error loading instructions:', error);
      setContent(normalizeInstructionContent(getDefaultContent()));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100">
      <main className="max-w-5xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Image
              src="/logoheader.jpg"
              alt={appName}
              width={150}
              height={100}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-transparent bg-clip-text mb-4">Anleitung zum Krankmeldungssystem</h1>
          <p className="text-lg text-gray-700">Alles was Sie wissen müssen — Schritt für Schritt erklärt</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
          >
            ← Zurück
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="space-y-8">
          <MarkdownContent content={content} />
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600 border-t border-gray-300 pt-8">
          <p>© 2026 {appName}</p>
          <p className="text-sm mt-2">Team Personal · Durchwahlen: 06301 607-111, -112, -113</p>
        </div>
      </main>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(content) }}
    />
  );
}

function renderMarkdownToHTML(markdown: string): string {
  // Simple markdown to HTML converter
  let html = markdown
    .split('\n')
    .map(line => {
      // Headings
      if (line.startsWith('# ')) {
        return `<h1 class="text-4xl font-bold text-gray-900 mb-6 mt-8">${line.substring(2)}</h1>`;
      }
      if (line.startsWith('## ')) {
        return `<h2 class="text-3xl font-bold text-gray-900 mb-6 mt-8">${line.substring(3)}</h2>`;
      }
      if (line.startsWith('### ')) {
        return `<h3 class="text-xl font-bold text-gray-900 mb-4">${line.substring(4)}</h3>`;
      }
      // Lists
      if (line.startsWith('- ')) {
        return `<li class="ml-4 text-gray-700">${line.substring(2)}</li>`;
      }
      if (line.match(/^\d+\. /)) {
        return `<li class="ml-4 text-gray-700">${line.replace(/^\d+\. /, '')}</li>`;
      }
      // Bold and italic
      if (line.includes('**')) {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
      }
      if (line.includes('*')) {
        line = line.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
      }
      // Normal paragraph
      if (line.trim()) {
        return `<p class="text-gray-700 leading-relaxed my-4">${line}</p>`;
      }
      return '';
    })
    .join('')
    .replace(/<li class/g, '<ul class="space-y-2"><li class')
    .replace(/(<\/li>)(?!.*<li)/g, '$1</ul>');

  return html;
}

function normalizeInstructionContent(content: string): string {
  return content
    .replace(
      '5. **Bestätigung & Sachbearbeitung** - Sie erhalten eine Bestätigungsemail und der Sachbearbeiter wird benachrichtigt',
      '5. **Bestätigung** - Falls Sie Ihre E-Mail-Adresse angegeben haben, erhalten Sie eine Bestätigungsemail und Ihr Arbeitgeber und die Personalverwaltung werden benachrichtigt.'
    )
    .replace(
      /Durchwahlen: 06301 607-111, -112, -113 oder -115/g,
      'Durchwahlen: 06301 607-111, -112, -113'
    )
    .replace(
      '- **📎 AU-Datei:** Immer erforderlich (JPG, PNG, PDF)',
      '- **📎 AU-Datei (optional):** Sie können den Nachweis direkt hochladen (JPG, PNG, PDF). Falls noch kein Nachweis vorliegt, reichen Sie diesen bitte zeitnah konventionell bei der Personalverwaltung nach.'
    );
}

function getDefaultContent(): string {
  return `# Willkommen!

Dieses moderne Krankmeldungssystem ermöglicht eine schnelle, sichere und datenschutzkonforme Meldung von Krankentagen. In nur wenigen Minuten haben Sie Ihre Meldung eingereicht.

## Welcher Meldungstyp passt zu Ihnen?

### 1️⃣ Meldung ohne AU
**Wann nutzen?** Kurzfristige Abwesenheit ohne ärztliche Bescheinigung, nur für den aktuellen Arbeitstag.

- **✓ Pflichtfelder:** Name, Vorname, Arbeitgeber, Datum
- **ℹ️ Info:** Optional per E-Mail bestätigen, Sachbearbeiter wird benachrichtigt

### 2️⃣ Meldung mit AU
**Wann nutzen?** Abwesenheit mit ärztlicher Bescheinigung (AU). Geben Sie Feststellungsdatum und Zeitraum an; AU-Datei kann hochgeladen werden.

- **✓ Pflichtfelder:** Name, Vorname, Arbeitgeber, Feststellungsdatum, Zeitraum
- **📎 AU-Datei (optional):** JPG, PNG, PDF (max. 5 MB). Mobilgeräte: Foto möglich.
- **🏷️ Erst- vs. Folgebescheinigung:** Erstbescheinigung: beide Daten frei wählbar. Folgebescheinigung: muss unmittelbar an die vorherige anschließen.

### 3️⃣ Meldung Kind krank
**Wann nutzen?** Betreuung eines kranken Kindes — AU des Kinderarztes ist erforderlich.

- **✓ Pflichtfelder:** Name, Vorname, Arbeitgeber, Kind-Name, Geburtsdatum des Kindes, Zeitraum
- **📎 AU-Datei (optional):** Sie können den Nachweis direkt hochladen (JPG, PNG, PDF). Falls noch kein Nachweis vorliegt, reichen Sie diesen bitte zeitnah konventionell bei der Personalverwaltung nach.
- **🎂 Altersgrenze:** Gilt für Kinder gemäß interner Richtlinien

## Der Prozess Schritt für Schritt

1. **Meldungstyp wählen** - Wählen Sie einen der drei Meldungstypen
2. **Formular ausfüllen** - Geben Sie alle erforderlichen Informationen ein
3. **Daten überprüfen** - Das System validiert automatisch Ihre Eingaben
4. **Senden** - Klicken Sie auf die Schaltfläche zum Einreichen
5. **Bestätigung** - Falls Sie Ihre E-Mail-Adresse angegeben haben, erhalten Sie eine Bestätigungsemail und Ihr Arbeitgeber und die Personalverwaltung werden benachrichtigt.

## Kontakt & Support

Bei Fragen oder Problemen kontaktieren Sie bitte die Personalverwaltung:

**📞 Team Personal**
Durchwahlen: 06301 607-111, -112, -113

## 🔒 Datenschutz & Vertraulichkeit

Alle eingereichten Meldungen werden gemäß DSGVO als vertrauliche Personaldaten behandelt und sind vollständig verschlüsselt.`;
}
