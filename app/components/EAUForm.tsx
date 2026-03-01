'use client';

import { FormEvent, useState } from 'react';
import SuccessModal from './SuccessModal';
import Tooltip from './Tooltip';
import { useRouter } from 'next/navigation';

interface EAUSubmissionForm {
  employee_name: string;
  employee_vorname: string;
  employee_email: string;
  employee_id: string;
  doctor_date: string;
  from_date: string;
  to_date: string;
  is_first_submission: boolean;
}

export default function EAUForm() {
  const [formData, setFormData] = useState<EAUSubmissionForm>({
    employee_name: '',
    employee_vorname: '',
    employee_email: '',
    employee_id: '',
    doctor_date: '',
    from_date: '',
    to_date: '',
    is_first_submission: true,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'is_first_submission') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/submit-eau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setFormData({
          employee_name: '',
          employee_vorname: '',
          employee_email: '',
          employee_id: '',
          doctor_date: '',
          from_date: '',
          to_date: '',
          is_first_submission: true,
        });
        router.push(`/success?id=${data.submissionId}`);
      } else {
        setMessage({ type: 'error', text: data.error || 'Ein Fehler ist aufgetreten' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Senden der Anfrage' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">eAU-Information eingeben</h2>
      <p className="text-sm text-gray-600 mb-6">
        Geben Sie die Informationen aus Ihrer elektronischen Arbeitsunfähigkeitsbescheinigung ein
      </p>

      {message && message.type === 'success' && (
        <SuccessModal
          title="Meldung eingegangen"
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {message && message.type === 'error' && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300">{message.text}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vorname <span className="text-red-500">*</span>
              </label>
              <Tooltip text="Ihr Vorname" position="top" />
            </div>
            <input
              type="text"
              name="employee_vorname"
              value={formData.employee_vorname}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              placeholder="Max"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nachname <span className="text-red-500">*</span>
              </label>
              <Tooltip text="Ihr Nachname" position="top" />
            </div>
            <input
              type="text"
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              placeholder="Mustermann"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mitarbeitenden-ID <span className="text-gray-500">(optional)</span>
            </label>
            <Tooltip text="Ihre persönliche Kennnummer aus der Personalverwaltung" position="top" />
          </div>
          <input
            type="text"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-600"
            placeholder="z.B. MA-12345"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Private E-Mail (optional, für Bestätigung)
            </label>
            <Tooltip text="Geben Sie Ihre private E-Mail-Adresse ein, um eine Bestätigung zu erhalten" position="top" />
          </div>
          <input
            type="email"
            name="employee_email"
            value={formData.employee_email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-600"
            placeholder="ihre.email@example.com"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feststellungsdatum (ärztlich - optional)
            </label>
            <Tooltip text="Das Datum, an dem der Arzt die Arbeitsunfähigkeit festgestellt hat" position="top" />
          </div>
          <input
            type="date"
            name="doctor_date"
            value={formData.doctor_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Von (Datum) <span className="text-red-500">*</span>
              </label>
              <Tooltip text="Der erste Tag Ihrer Arbeitsunfähigkeit" position="top" />
            </div>
            <input
              type="date"
              name="from_date"
              value={formData.from_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bis (Datum) <span className="text-red-500">*</span>
              </label>
              <Tooltip text="Der letzte Tag Ihrer Arbeitsunfähigkeit" position="top" />
            </div>
            <input
              type="date"
              name="to_date"
              value={formData.to_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meldungstyp <span className="text-red-500">*</span>
            </label>
            <Tooltip text="Erstmeldung: Erste AU für diese Krankheit. Folgemeldung: Verlängerung einer bestehenden AU" position="top" />
          </div>
          <select
            name="is_first_submission"
            value={formData.is_first_submission.toString()}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="true">Erstmeldung</option>
            <option value="false">Folgemeldung</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition"
        >
          {loading ? 'Wird gesendet...' : 'eAU-Information einreichen'}
        </button>
      </form>
    </div>
  );
}
