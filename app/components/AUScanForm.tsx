'use client';

import { FormEvent, useState, useEffect } from 'react';
import FileUploadDropzone from './FileUploadDropzone';
import SuccessModal from './SuccessModal';
import Tooltip from './Tooltip';
import { useRouter } from 'next/navigation';

interface AUSubmissionForm {
  employee_name: string;
  employee_vorname: string;
  employee_email: string;
  employer: string;
  doctor_date: string;
  from_date: string;
  to_date: string;
  is_first_cert: boolean;
  au_scan: File | null;
}

interface EmployerOption {
  name: string;
  active: boolean;
}

export default function AUScanForm() {
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [formData, setFormData] = useState<AUSubmissionForm>({
    employee_name: '',
    employee_vorname: '',
    employee_email: '',
    employer: '',
    doctor_date: '',
    from_date: '',
    to_date: '',
    is_first_cert: true,
    au_scan: null,
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
                return { name: emp, active: true };
              }
              return { name: emp.name, active: Boolean(emp.active) };
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'is_first_cert') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (file: File) => {
    setFormData(prev => ({ ...prev, au_scan: file }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('employee_name', formData.employee_name);
      formDataToSend.append('employee_vorname', formData.employee_vorname);
      formDataToSend.append('employee_email', formData.employee_email);
      formDataToSend.append('employer', formData.employer);
      formDataToSend.append('doctor_date', formData.doctor_date);
      formDataToSend.append('from_date', formData.from_date);
      formDataToSend.append('to_date', formData.to_date);
      formDataToSend.append('is_first_cert', formData.is_first_cert.toString());
      if (formData.au_scan) {
        formDataToSend.append('au_scan', formData.au_scan);
      }

      const response = await fetch('/api/submit-auscan', {
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
          doctor_date: '',
          from_date: '',
          to_date: '',
          is_first_cert: true,
          au_scan: null,
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

  const activeEmployers = employers.filter((emp) => emp.active);
  const inactiveEmployers = employers.filter((emp) => !emp.active);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Meldung mit AU</h2>
      <p className="text-sm text-gray-600 mb-6">
        Mit ärztlicher Arbeitsunfähigkeitsbescheinigung (Scan oder eAU-Daten)
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-600"
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
              Arbeitgeber <span className="text-red-500">*</span>
            </label>
            <Tooltip text="Wählen Sie Ihren Arbeitgeber aus" position="top" />
          </div>
          <select
            name="employer"
            value={formData.employer}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-600"
          >
            <option value="">-- Wählen Sie einen Arbeitgeber --</option>
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
                Von (Datum) {formData.is_first_cert ? <span className="text-red-500">*</span> : ''}
              </label>
              <Tooltip text="Der erste Tag Ihrer Arbeitsunfähigkeit" position="top" />
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
              Bescheinigungstyp <span className="text-red-500">*</span>
            </label>
            <Tooltip text="Erstbescheinigung: Erste AU für diese Krankheit. Folgebescheinigung: Verlängerung einer bestehenden AU" position="top" />
          </div>
          <select
            name="is_first_cert"
            value={formData.is_first_cert.toString()}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="true">Erstbescheinigung</option>
            <option value="false">Folgebescheinigung</option>
          </select>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AU-Scan (optional; PDF oder Bild)
            </label>
            <Tooltip text="Hochladen der AU-Bescheinigung (JPG, PNG oder PDF, max. 5 MB)" position="top" />
          </div>
          <FileUploadDropzone 
            onFileSelect={handleFileChange}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition"
        >
          {loading ? 'Wird gesendet...' : 'AU einreichen'}
        </button>
      </form>
    </div>
  );
}
