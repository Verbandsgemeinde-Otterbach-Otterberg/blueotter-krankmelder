'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, AlertCircle } from 'lucide-react';

interface MarkdownEditorProps {
  slug: string;
  onSave?: () => void;
}

export default function MarkdownEditor({ slug, onSave }: MarkdownEditorProps) {
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadContent();
  }, [slug]);

  async function loadContent() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/cms/content?slug=${slug}`);
      if (response.ok) {
        const data = await response.json();
        const loadedContent = slug === 'instructions'
          ? normalizeInstructionContent(data.content || '')
          : (data.content || '');
        setContent(loadedContent);
      } else if (response.status === 404) {
        // Content nicht gefunden - initialize mit default
        setContent(getDefaultContent(slug));
      } else {
        throw new Error('Failed to load content');
      }
    } catch (err) {
      setError('Fehler beim Laden des Inhalts');
      setContent(getDefaultContent(slug));
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveContent() {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/cms/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content })
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSave?.();
    } catch (err) {
      setError('Fehler beim Speichern des Inhalts');
      console.error('Error saving content:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-900">Anleitung bearbeiten</h3>
          {preview && <span className="text-sm text-gray-500 ml-2">📄 Vorschau</span>}
          {!preview && <span className="text-sm text-gray-500 ml-2">✏️ Bearbeitung</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? 'Bearbeiten' : 'Vorschau'}
          </button>
          <button
            onClick={saveContent}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <p className="text-sm text-green-700">✓ Änderungen gespeichert</p>
        </div>
      )}

      {!preview ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-96 p-4 font-mono text-sm border-none resize-none focus:ring-0 text-gray-800"
          placeholder="Geben Sie Markdown-Inhalte ein..."
        />
      ) : (
        <div className="p-6 prose prose-sm max-w-none">
          <MarkdownPreview content={content} />
        </div>
      )}
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const renderMarkdown = (markdown: string) => {
    // Simple markdown rendering
    let html = markdown
      .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/\n\n/g, '</p><p class="my-3">')
      .replace(/^\- (.*?)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*?)$/gm, '<li class="ml-4">$1</li>');

    return `<div class="text-gray-700 leading-relaxed"><p class="my-3">${html}</p></div>`;
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      className="text-gray-700 leading-relaxed"
    />
  );
}

function getDefaultContent(slug: string): string {
  if (slug === 'instructions') {
    return normalizeInstructionContent(`# Willkommen!

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

Alle eingereichten Meldungen werden gemäß DSGVO als vertrauliche Personaldaten behandelt und sind vollständig verschlüsselt.`);
  }
  return '';
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
