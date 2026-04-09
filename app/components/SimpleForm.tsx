"use client";

import { FormEvent, useState, useEffect } from 'react';
import { User, Building, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import SuccessModal from './SuccessModal';
import Tooltip from './Tooltip';
import { useRouter } from 'next/navigation';
import formatDDMMYYYY from '@/app/lib/format';

interface SimpleSubmissionForm {
  employee_name: string;
  employee_vorname: string;
  employee_email: string;
  employer: string;
  date: string;
  remarks: string;
}

interface EmployerOption {
  name: string;
  active: boolean;
  requires_remarks?: boolean;
}

export default function SimpleForm() {
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [availableDates, setAvailableDates] = useState<{value: string, label: string}[]>([]);
  const [formData, setFormData] = useState<SimpleSubmissionForm>({
    employee_name: '',
    employee_vorname: '',
    employee_email: '',
    employer: '',
    date: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadEmployers = async () => {
      try {
        const res = await fetch('/api/config/employers');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mappedEmployers = json.data
            .map((emp: string | EmployerOption) => {
              if (typeof emp === 'string') {
                return { name: emp, active: true, requires_remarks: false };
              }
              return { name: emp.name, active: Boolean(emp.active), requires_remarks: Boolean(emp.requires_remarks) };
            })
            .filter((emp: EmployerOption) => Boolean(emp.name));
          setEmployers(mappedEmployers);
        }
      } catch (err) {
        console.error('Error loading employers', err);
      }
    };
    loadEmployers();
  }, []);

  useEffect(() => {
    const calculateAvailableDates = () => {
      const today = new Date();
      const dates: {value:string,label:string}[] = [];
      if (today.getDay() >= 1 && today.getDay() <= 5) {
        dates.push({
          value: today.toISOString().split('T')[0],
          label: `Heute (${formatDDMMYYYY(today)})`
        });
      }
      setAvailableDates(dates);
      if (dates.length > 0) {
        setFormData(prev => ({ ...prev, date: dates[0].value }));
      }
    };
    calculateAvailableDates();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/submit-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // navigate to shared success page with submission ID
        setFormData({ employee_name: '', employee_vorname: '', employee_email: '', employer: '', date: '', remarks: '' });
        router.push(`/success?id=${data.submissionId}`);
      } else {
        setMessage({ type: 'error', text: data.error || data.message || 'Ein Fehler ist aufgetreten' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler. Bitte versuchen Sie es später erneut.' });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDateLabel = () => {
    const selected = availableDates.find(d => d.value === formData.date);
    return selected ? selected.label : (formData.date ? formatDDMMYYYY(formData.date) : '');
  };

  const activeEmployers = employers.filter((emp) => emp.active);
  const inactiveEmployers = employers.filter((emp) => !emp.active);
  const selectedEmployer = employers.find((emp) => emp.name === formData.employer);
  const showRemarksField = Boolean(selectedEmployer?.requires_remarks);

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Krankmeldung (einfach)</h3>
          <p className="text-gray-700">Einfaches Formular: alle Angaben in einem Schritt</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
            <input type="text" name="employee_vorname" value={formData.employee_vorname} onChange={handleChange} placeholder="Max" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
            <input type="text" name="employee_name" value={formData.employee_name} onChange={handleChange} placeholder="Mustermann" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Private E-Mail (optional - nur mit E-Mail wird eine Bestätigung gesendet)</label>
          <input type="email" name="employee_email" value={formData.employee_email} onChange={handleChange} placeholder="ihre.email@beispiel.de" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Arbeitgeber *</label>
          <select name="employer" value={formData.employer} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white">
            <option value="">Arbeitgeber auswählen</option>
            {activeEmployers.map((emp) => (
              <option key={emp.name} value={emp.name}>
                {emp.name}
              </option>
            ))}
            {inactiveEmployers.map((emp) => (
              <option key={emp.name} value={emp.name} disabled className="text-gray-400">
                {emp.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-600">
            Hinweis: Ausgegraute Arbeitgeber werden zu einem späteren Zeitpunkt für den digitalen Workflow freigeschaltet. Bitte reichen Sie Meldungen dafür bis auf Weiteres auf dem konventionellen Weg ein.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Krankheitsdatum *</label>
          <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-900 font-medium">{availableDates[0]?.label || 'Heute'}</p>
            <p className="text-sm text-gray-600">Hinweis: Im einfachen Formular ist nur der aktuelle Tag möglich.</p>
          </div>
          <input type="hidden" name="date" value={formData.date} />
        </div>

        {showRemarksField && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bemerkung (optional)</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={4}
              placeholder="Optional: zusätzliche Hinweise"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="mt-2 text-xs text-gray-600">
              Für diesen Arbeitgeber kann eine zusätzliche Bemerkung mitgesendet werden.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">Wichtiger Hinweis</h4>
              <p className="text-sm text-blue-700">Bei längeren Abwesenheiten (über 3 Tage) ist eine ärztliche Arbeitsunfähigkeitsbescheinigung erforderlich. Verwenden Sie in diesem Fall die "Meldung mit AU".</p>
            </div>
          </div>
        </div>

        <div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">
            {loading ? 'Wird gesendet...' : 'Krankmeldung absenden'}
          </button>
        </div>
      </form>

      {message?.type === 'success' && (
        <SuccessModal title="Krankmeldung erfolgreich eingereicht" message="Ihre Krankmeldung wurde erfolgreich übermittelt." onClose={() => setMessage(null)} />
      )}

      {/* Error Message */}
      {message?.type === 'error' && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <p className="text-sm text-red-800">{message.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
