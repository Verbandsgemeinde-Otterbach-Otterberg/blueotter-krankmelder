import React from 'react';

interface Props {
  title?: string;
  message: string;
  onClose: () => void;
}

export default function SuccessModal({ title = 'Erfolgreich', message, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />

      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <p className="mt-2 text-gray-700">{message}</p>
            <p className="mt-3 text-gray-600 font-medium">Wir wünschen Ihnen gute Besserung!</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
