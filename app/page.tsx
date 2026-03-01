'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGlobalSettings } from '@/app/lib/useGlobalSettings';
import { Calendar, FileText, Heart, CheckCircle, ArrowRight, ArrowLeft, Info, Shield, Clock } from 'lucide-react';
import SimpleForm from '@/app/components/SimpleForm';
import AUScanForm from '@/app/components/AUScanForm';
import ChildcareForm from '@/app/components/ChildcareForm';
import PasswordGate from '@/app/components/PasswordGate';

type FormType = 'simple' | 'auscan' | 'childcare';

interface FormOption {
  id: FormType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  requirements: string[];
}

const formOptions: FormOption[] = [
  {
    id: 'simple',
    title: 'Einfache Krankmeldung',
    description: 'Für Abwesenheiten ohne ärztliche Bescheinigung — nur für den aktuellen Arbeitstag',
    icon: Calendar,
    color: 'blue',
    requirements: ['Nur aktueller Tag', 'Keine AU-Bescheinigung notwendig']
  },
  {
    id: 'auscan',
    title: 'Krankmeldung mit AU',
    description: 'Für Abwesenheiten mit ärztlicher Bescheinigung (AU) — auch für mehrere Tage',
    icon: FileText,
    color: 'green',
    requirements: ['AU-Bescheinigung erforderlich', 'Scan oder Foto hochladen']
  },
  {
    id: 'childcare',
    title: 'Kind krank melden',
    description: 'Abwesenheit wegen Pflege eines erkrankten Kindes',
    icon: Heart,
    color: 'purple',
    requirements: ['Ärztliche Bescheinigung', 'Für Kinder unter 12 Jahren']
  }
];

export default function Home() {
  const globalSettings = useGlobalSettings();
  const [currentStep, setCurrentStep] = useState<'selection' | 'form'>('selection');
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);

  const handleFormSelect = (formType: FormType) => {
    setSelectedForm(formType);
    setCurrentStep('form');
  };

  const handleBack = () => {
    setCurrentStep('selection');
    setSelectedForm(null);
  };

  const getFormComponent = () => {
    switch (selectedForm) {
      case 'simple':
        return <SimpleForm />;
      case 'auscan':
        return <AUScanForm />;
      case 'childcare':
        return <ChildcareForm />;
      default:
        return null;
    }
  };

  return (
    <PasswordGate showLogo={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Image
                  src="/logoheader.jpg"
                  alt={globalSettings.appName}
                  width={180}
                  height={120}
                  className="object-contain drop-shadow-lg"
                  priority
                />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              {globalSettings.appName}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-medium max-w-2xl mx-auto">
              {globalSettings.appSlogan}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === 'selection' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                1
              </div>
              <div className={`w-12 h-1 ${currentStep === 'form' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                2
              </div>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 'selection' ? (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Wählen Sie den Meldungstyp
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Wählen Sie den Typ, der Ihrer Situation entspricht. Jeder Typ hat kurze Hinweise zu Anforderungen.
                </p>
              </div>

              {/* Form Options Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {formOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleFormSelect(option.id)}
                      className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-${option.color}-200 p-6`}
                    >
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${option.color}-100 group-hover:bg-${option.color}-200 transition-colors duration-200 mb-4`}>
                        <Icon className={`w-8 h-8 text-${option.color}-600`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{option.title}</h3>
                      <p className="text-gray-700 mb-4 leading-relaxed">{option.description}</p>
                      <div className="space-y-2 mb-6">
                        {option.requirements.map((req, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {req}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                        Auswählen
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-3">
                      <Clock className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Schnell</h4>
                      <p className="text-sm text-gray-700">Bearbeitung meist in Minuten</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-3">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Sicher</h4>
                      <p className="text-sm text-gray-700">Datenschutzkonform (DSGVO)</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-3">
                      <CheckCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Zuverlässig</h4>
                      <p className="text-sm text-gray-700">Automatische Verarbeitung</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück zur Auswahl
              </button>

              {/* Form */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                {getFormComponent()}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <Info className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    © 2026 {globalSettings.appName} | Datenschutzkonform nach DSGVO
                  </span>
                </div>
                <div className="flex space-x-4 items-center">
                  <a href="/instructions" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Anleitung
                  </a>
                  <span className="text-gray-300">|</span>
                  <a href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Sachbearbeiter-Bereich
                  </a>
                <div className="mt-4 text-xs text-gray-500">
                  {globalSettings.appName} v10.02 • 20.02.2026
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PasswordGate>
  );
}
