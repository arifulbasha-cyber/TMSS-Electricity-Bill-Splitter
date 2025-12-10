
import React, { useState } from 'react';
import { Tenant } from '../types';
import { useLanguage } from '../i18n';
import { X, Save, Plus, Trash2, User, Phone, Mail, Edit2 } from 'lucide-react';

interface TenantManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  onUpdateTenants: (tenants: Tenant[]) => void;
}

const TenantManager: React.FC<TenantManagerProps> = ({ isOpen, onClose, tenants, onUpdateTenants }) => {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Tenant>>({});
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const startAdd = () => {
    setEditingId(null);
    setForm({});
    setIsAdding(true);
  };

  const startEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setForm(tenant);
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({});
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this tenant?')) {
      onUpdateTenants(tenants.filter(x => x.id !== id));
    }
  };

  const handleSave = () => {
    if (!form.name) return;

    if (editingId) {
      // Update
      const updated = tenants.map(t => t.id === editingId ? { ...t, ...form } as Tenant : t);
      onUpdateTenants(updated);
    } else {
      // Create
      const newTenant: Tenant = {
        id: Date.now().toString(),
        name: form.name,
        phone: form.phone,
        email: form.email
      };
      onUpdateTenants([...tenants, newTenant]);
    }
    cancelEdit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('tenant_manager')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('tenant_desc')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* List or Form */}
          {isAdding ? (
             <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase mb-2">{editingId ? 'Edit Tenant' : 'Add New Tenant'}</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('name')}</label>
                  <input 
                    type="text" 
                    value={form.name || ''} 
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g. Uttom"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('phone')}</label>
                  <input 
                    type="text" 
                    value={form.phone || ''} 
                    onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="017..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('email')}</label>
                  <input 
                    type="email" 
                    value={form.email || ''} 
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="example@gmail.com"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                   <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                      <Save className="w-4 h-4 inline mr-1" /> Save
                   </button>
                   <button onClick={cancelEdit} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                      Cancel
                   </button>
                </div>
             </div>
          ) : (
             <div className="space-y-3">
               <button 
                  onClick={startAdd}
                  className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2 group"
               >
                  <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  {t('add_tenant')}
               </button>

               {tenants.length === 0 && (
                 <div className="text-center text-slate-400 text-sm py-8">{t('no_tenants')}</div>
               )}

               <div className="space-y-2">
                 {tenants.map(tenant => (
                   <div key={tenant.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden">
                         <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                            {tenant.name.substring(0, 2).toUpperCase()}
                         </div>
                         <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{tenant.name}</div>
                            <div className="flex flex-col sm:flex-row sm:gap-3 text-xs text-slate-500 dark:text-slate-400">
                               {tenant.phone && <span className="flex items-center gap-1 truncate"><Phone className="w-3 h-3" /> {tenant.phone}</span>}
                               {tenant.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {tenant.email}</span>}
                            </div>
                         </div>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                         <button onClick={() => startEdit(tenant)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDelete(tenant.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantManager;
