import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Save, Trash2, AlertTriangle, CheckCircle2, Cloud, Database } from 'lucide-react';
import { checkApiKeys } from '@/lib/services/geminiService';

interface Props {
  onBack: () => void;
}

export const SettingsView: React.FC<Props> = ({ onBack }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ geminiConfigured: boolean; openaiConfigured: boolean } | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(true);

  useEffect(() => {
    // Pre-fill with defaults if local storage is empty, so user sees the active configuration
    setSupabaseUrl(localStorage.getItem('supabase_url') || 'https://ujyjsmlasctasluxpuyn.supabase.co');
    setSupabaseKey(localStorage.getItem('supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeWpzbWxhc2N0YXNsdXhwdXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0ODM3MDAsImV4cCI6MjA2MTA1OTcwMH0.0GXUKWhJ8Ck9zSkslKvrKOhFnsi-5jO0TT4qLAH5yf4');
    
    // Check API key status
    checkApiKeys().then(status => {
      setApiKeyStatus(status);
      setLoadingKeys(false);
    }).catch(() => {
      setLoadingKeys(false);
    });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('supabase_url', supabaseUrl.trim());
    localStorage.setItem('supabase_key', supabaseKey.trim());
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    
    // Force reload to pick up new clients
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearData = () => {
    if (confirm("Are you sure? This will delete all student progress and lesson history from LOCAL storage (not Cloud).")) {
      localStorage.removeItem('mandarin_master_lessons');
      alert("Local data cleared.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 flex items-center gap-4 text-white">
          <button onClick={onBack} className="hover:bg-slate-800 p-2 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">App Settings</h1>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          
          {/* API Keys Info */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-brand-100 p-2 rounded-lg">
                <Key className="text-brand-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">AI Configuration</h2>
                <p className="text-slate-500 text-sm">API keys are configured on the server.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-700">API Keys Status</p>
                    <p className="text-xs text-slate-500 mt-1">
                      API keys are managed via Netlify environment variables (GEMINI_API_KEY, OPENAI_API_KEY). No manual configuration needed.
                    </p>
                  </div>
                </div>
                {loadingKeys ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded">
                    <span>Checking API key status...</span>
                  </div>
                ) : (
                  <>
                    {apiKeyStatus?.geminiConfigured ? (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded">
                        <CheckCircle2 size={14} />
                        <span>Gemini API Key: Configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
                        <AlertTriangle size={14} />
                        <span>Gemini API Key: Not configured (check Netlify environment variables: GEMINI_API_KEY)</span>
                      </div>
                    )}
                    {apiKeyStatus?.openaiConfigured ? (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded">
                        <CheckCircle2 size={14} />
                        <span>OpenAI API Key: Configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded">
                        <span>OpenAI API Key: Optional (not configured - set OPENAI_API_KEY in Netlify if needed)</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Supabase Configuration */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Cloud className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Cloud Sync (Supabase)</h2>
                <p className="text-slate-500 text-sm">Required for sharing data between devices.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Project URL</label>
                <input 
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Anon API Key</label>
                <input 
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="Enter Supabase Anon Key"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Defaults are loaded. Leave blank to revert to defaults if cleared.
              </p>
            </div>
          </section>

          <div className="flex justify-end">
             <button 
                type="submit"
                className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg ${
                saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-black'
                }`}
            >
                {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {saved ? 'Settings Saved' : 'Save Settings'}
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Danger Zone */}
          <section>
             <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Danger Zone</h2>
                <p className="text-slate-500 text-sm">Manage local browser data.</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex justify-between items-center">
              <div className="text-red-800 text-sm">
                <strong>Clear Local Data:</strong> Removes offline data from this browser.
              </div>
              <button 
                type="button"
                onClick={handleClearData}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} /> Clear Local
              </button>
            </div>
          </section>

        </form>
      </div>
    </div>
  );
};
