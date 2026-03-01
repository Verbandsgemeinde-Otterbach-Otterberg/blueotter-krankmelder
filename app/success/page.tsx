"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('id');
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    if (!submissionId) return;
    setDownloading(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meldung_${submissionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Fehler beim Herunterladen der PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Fehler beim Herunterladen der PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-green-700">Meldung erfolgreich eingereicht</h1>
        <p className="text-gray-700 mb-4">Vielen Dank. Ihre Meldung wurde erfolgreich übermittelt.</p>

        {submissionId && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Wird heruntergeladen...' : 'PDF Meldung herunterladen'}
            </button>
          </div>
        )}

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Hilfreich? Bewerten Sie die Abwicklung anonym (1–5 Sterne)</p>
          <StarRating />
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Zur Startseite</Link>
        </div>
      </div>
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={filled ? 'text-yellow-500' : 'text-gray-300'}>
      <path d="M12 .587l3.668 7.431L23.5 9.75l-5.5 5.365L19.335 23 12 19.77 4.665 23 6 15.115 0.5 9.75l7.832-1.732L12 .587z" />
    </svg>
  );
}

function StarRating() {
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (r: number) => {
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: r })
      });
      setSubmitted(true);
      // Nach 2 Sekunden zu Tic-Tac-Toe navigieren
      setTimeout(() => {
        window.location.href = '/easteregg/tictactoe';
      }, 2000);
    } catch (err) {
      console.error('Feedback error', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2">
        {[1,2,3,4,5].map((i) => (
          <button key={i} onClick={() => { if (!submitting && !submitted) { setRating(i); submit(i); } }} disabled={submitting || submitted} aria-label={`Rate ${i}`}>
            <Star filled={rating !== null && i <= (rating as number)} />
          </button>
        ))}
      </div>
      {submitted && (
        <div className="text-center mt-2">
          <p className="text-sm text-green-700">Danke für Ihr anonymes Feedback.</p>
          <p className="text-xs text-gray-600 mt-1">Gleich gehts weiter zu einer Überraschung... 🎮</p>
        </div>
      )}
    </div>
  );
}
