
import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { X, Cloud, Save, AlertCircle } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import { FirebaseConfigJson } from '../types';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

const CloudSetupModal: React.FC<CloudSetupModalProps> = ({ isOpen, onClose, onConnected }) => {
  const { t } = useLanguage();
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = () => {
    try {
      const config: FirebaseConfigJson = JSON.parse(jsonInput);
      firebaseService.initialize(config);
      onConnected();
      onClose();
    } catch (e: any) {
      setError("Invalid JSON or Configuration. Please copy the object exactly from Firebase Console.");
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-colors duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> {t('cloud_setup')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('cloud_desc')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('paste_config')}</label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-40 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t('config_placeholder')}
            ></textarea>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Go to Firebase Console &gt; Project Settings &gt; General &gt; Your Apps &gt; SDK Setup and copy the `firebaseConfig` object.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
            {t('cancel')}
          </button>
          <button 
            onClick={handleConnect}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 rounded-lg shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {t('connect')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSetupModal;
