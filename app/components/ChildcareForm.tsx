'use client';

import { FormEvent, useState, useEffect } from 'react';
import FileUploadDropzone from './FileUploadDropzone';
import SuccessModal from './SuccessModal';
import Tooltip from './Tooltip';
import { useRouter } from 'next/navigation';

interface ChildcareSubmissionForm {
  employee_name: string;
  employee_vorname: string;
  employee_email: string;
  employer: string;
  child_name: string;
  child_dob: string;
  from_date: string;
  to_date: string;
  is_first_cert: boolean;
  au_file: File | null;
  remarks: string;
}

interface EmployerOption {
  name: string;
  active: boolean;
  requires_remarks?: boolean;
}

export default function ChildcareForm() {
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [formData, setFormData] = useState<ChildcareSubmissionForm>({
    employee_name: '',
    employee_vorname: '',
    employee_email: '',
    employer: '',
    child_name: '',
    child_dob: '',
    from_date: '',
    to_date: '',
    is_first_cert: true,
    au_file: null,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'is_first_cert') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (file: File) => {
    setFormData(prev => ({ ...prev, au_file: file }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const noProofMessage = 'Sie haben Ihrer Meldung keinen Nachweis beigefügt. Bitte reichen Sie den Nachweis zeitnah bei der Personalverwaltung ein oder melden sich erneut über das Formular "Kind Krank" wenn Ihnen der Nachweis vorliegt.';

    if (!formData.au_file) {
      alert(noProofMessage);
    }
    
    setLoading(true);
    setMessage(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('employee_name', formData.employee_name);
      formDataToSend.append('employee_vorname', formData.employee_vorname);
      formDataToSend.append('employee_email', formData.employee_email);
      formDataToSend.append('employer', formData.employer);
      formDataToSend.append('child_name', formData.child_name);
      formDataToSend.append('child_dob', formData.child_dob);
      formDataToSend.append('from_date', formData.from_date);
      formDataToSend.append('to_date', formData.to_date);
      formDataToSend.append('is_first_cert', formData.is_first_cert.toString());
      formDataToSend.append('remarks', formData.remarks);
      if (formData.au_file) {
        formDataToSend.append('au_file', formData.au_file);
      }

      const response = await fetch('/api/submit-childcare', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        setFormData({
          employee_name: '',
          employee_vorname: '',
          employee_email: '',
          employer: '',
          child_name: '',
          child_dob: '',
          from_date: '',
          to_date: '',
          is_first_cert: true,
          au_file: null,
          remarks: '',
        });
        router.push(`/success?id=${data.submissionId}`);
      } else {
        setMessage({ type: 'error', text: data.error || data.message || 'Ein Fehler ist aufgetreten' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Senden der Anfrage' });
    } finally {
      setLoading(false);
    }
  };

  const activeEmployers = employers.filter((emp) => emp.active);
  const inactiveEmployers = employers.filter((emp) => !emp.active);
  const selectedEmployer = employers.find((emp) => emp.name === formData.employer);
  const showRemarksField = Boolean(selectedEmployer?.requires_remarks);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Kindkrank-Meldung (§ 45 SGB V)</h2>
      <p className="text-sm text-gray-600 mb-6">
        Meldung für Abwesenheit wegen Pflege eines erkrankten Kindes mit ärztlicher Bescheinigung
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
              placeholder="Vorname"
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
              placeholder="Nachname"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arbeitgeber <span className="text-red-500">*</span>
            </label>
            <Tooltip text="Wählen Sie Ihren Arbeitgeber aus der Liste" position="top" />
          </div>
          <select
            name="employer"
            value={formData.employer}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
          >
            <option value="">-- Bitte wählen --</option>
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
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Private E-Mail (optional - nur mit E-Mail wird eine Bestätigung gesendet)
            </label>
            <Tooltip text="Geben Sie Ihre private E-Mail-Adresse ein, um eine Bestätigung zu erhalten" position="top" />
          </div>
          <input
            type="email"
            name="employee_email"
            value={formData.employee_email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
            placeholder="ihre.email@example.com"
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold text-gray-700 mb-3">Bescheinigungstyp</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Art der Bescheinigung <span className="text-red-500">*</span>
            </label>
            <select
              name="is_first_cert"
              value={formData.is_first_cert ? 'true' : 'false'}
              onChange={(e) =>
                setFormData({ ...formData, is_first_cert: e.target.value === 'true' })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="true">Erstbescheinigung</option>
              <option value="false">Folgebescheinigung</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold text-gray-700 mb-3">Zeitraum der Abwesenheit</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Von (Datum) {!formData.is_first_cert ? '' : <span className="text-red-500">*</span>}
                </label>
                <Tooltip text="Der erste Tag der Betreuung" position="top" />
              </div>
              <input
                type="date"
                name="from_date"
                value={formData.from_date}
                onChange={handleChange}
                disabled={!formData.is_first_cert}
                required={formData.is_first_cert}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Bis (Datum) <span className="text-red-500">*</span>
                </label>
                <Tooltip text="Der letzte Tag der Betreuung" position="top" />
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
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold text-gray-700 mb-3">Angaben zum Kind</h3>

          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name des Kindes <span className="text-red-500">*</span>
              </label>
              <Tooltip text="Der Vorname und Nachname des betreuungsbedürftigen Kindes" position="top" />
            </div>
            <input
              type="text"
              name="child_name"
              value={formData.child_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              placeholder="Name des Kindes"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geburtsdatum des Kindes <span className="text-red-500">*</span>
              </label>
              <Tooltip text="Das Kind muss zwischen 1 und 18 Jahren alt sein (§ 45 SGB V)" position="top" />
            </div>
            <input
              type="date"
              name="child_dob"
              value={formData.child_dob}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        {showRemarksField && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-gray-700 mb-3">Zusätzliche Bemerkung</h3>
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bemerkung <span className="text-gray-500">(optional)</span>
                </label>
                <Tooltip text="Optionales Bemerkungsfeld für zusätzliche Hinweise" position="top" />
              </div>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={4}
                placeholder="Optional: zusätzliche Hinweise"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold text-gray-700 mb-3">Ärztliche Bescheinigung</h3>
          <p className="text-sm text-gray-700 mb-2">Optional (JPG, PNG oder PDF)</p>
          <FileUploadDropzone
            onFileSelect={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10485760}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition"
        >
          {loading ? 'Wird gesendet...' : 'Kindkrank-Meldung einreichen'}
        </button>
      </form>
    </div>
  );
}
