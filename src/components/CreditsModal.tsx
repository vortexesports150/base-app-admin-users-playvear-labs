import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Loader2, CreditCard, Clock, CheckCircle, AlertCircle, Coins } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp, doc } from 'firebase/firestore';

interface PaymentRequest {
  id: string;
  amount: number;
  credits: number;
  method: 'bkash' | 'nagad' | 'rocket';
  transactionId: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: any;
}

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose, userId, userEmail }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [amount, setAmount] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('add');
    } else {
      // Reset inputs when closed
      setAmount('');
      setTransactionId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      }
    });

    return () => {
      unsubscribeSettings();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'history') return;

    const q = query(
      collection(db, 'payment_requests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRequest[];
      setRequests(items);
    });

    return () => {
      unsubscribeRequests();
    };
  }, [isOpen, userId, activeTab]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !transactionId) return;

    setIsSubmitting(true);
    try {
      const numAmount = parseFloat(amount);
      const credits = numAmount; 

      await addDoc(collection(db, 'payment_requests'), {
        userId,
        userEmail,
        amount: numAmount,
        credits: credits,
        method: selectedMethod,
        transactionId: transactionId.trim(),
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setAmount('');
      setTransactionId('');
      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#090b0e] border border-[#00f3ff]/30 w-full max-w-md rounded-[24px] overflow-hidden shadow-[0_0_40px_rgba(0,243,255,0.15)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header - Brand Colors Balanced */}
        <div className="p-5 border-b border-stone-800/80 flex items-center justify-between bg-[#0d1017]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f3ff]/10 border border-[#00f3ff]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.2)]">
              <Coins className="w-5 h-5 text-[#00f3ff]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                Add Credits
              </h2>
              <p className="text-[9px] text-stone-500 uppercase font-bold tracking-widest leading-none mt-0.5">
                Labs Payment System
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-stone-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Neon Cyan Focus */}
        <div className="flex border-b border-stone-800/80 bg-[#0d1017]/40 px-2">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'add' ? 'text-[#00f3ff]' : 'text-stone-600 hover:text-stone-300'
            }`}
          >
            Deposit
            {activeTab === 'add' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#00f3ff] rounded-t-full shadow-[0_-4px_10px_rgba(0,243,255,0.5)]" />}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'history' ? 'text-[#00f3ff]' : 'text-stone-600 hover:text-stone-300'
            }`}
          >
            History
            {activeTab === 'history' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#00f3ff] rounded-t-full shadow-[0_-4px_10px_rgba(0,243,255,0.5)]" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {activeTab === 'add' ? (
            <div className="flex flex-col gap-7">
              {/* Method Selector - Neon Cyan */}
              <div className="grid grid-cols-3 gap-2.5">
                {(['bkash', 'nagad', 'rocket'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={`py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedMethod === m
                        ? 'bg-[#00f3ff]/10 border-[#00f3ff]/60 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.1)]'
                        : 'bg-[#121620] border-stone-800 text-stone-500 hover:border-stone-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Account Info - Cyan & Magenta Mix */}
              {settings?.[selectedMethod] ? (
                <div className="bg-[#121620]/80 border border-stone-800/80 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f3ff]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[#00f3ff]/10 transition-colors" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-stone-500 font-black">
                      {settings[selectedMethod].type} Account
                    </span>
                    <span className="text-[8px] text-fuchsia-400 font-black bg-fuchsia-500/10 px-2.5 py-1 rounded-full uppercase border border-fuchsia-500/20 shadow-[0_0_10px_rgba(217,70,239,0.1)]">
                      Active Portal
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 relative z-10">
                    <span className="text-2xl font-mono font-black text-white tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                      {settings[selectedMethod].number}
                    </span>
                    <button
                      onClick={() => handleCopy(settings[selectedMethod].number, selectedMethod)}
                      className="p-2.5 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 rounded-xl text-[#00f3ff] transition-all active:scale-90"
                    >
                      {copied === selectedMethod ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-stone-500 leading-relaxed italic font-medium relative z-10">
                    * উপরের নাম্বারে টাকা পাঠিয়ে নিচে ট্রানজ্যাকশন আইডি দিন।
                  </p>
                </div>
              ) : (
                <div className="py-6 border-2 border-dashed border-stone-800/50 rounded-2xl text-center">
                  <p className="text-[11px] font-bold text-stone-600 uppercase tracking-widest">Portal Offline</p>
                </div>
              )}

              {/* Package Grid - Magenta Accents (20%) */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                   Select Package
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 200, 500].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAmount(c.toString())}
                      className={`py-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        amount === c.toString()
                          ? 'bg-fuchsia-500/10 border-fuchsia-500/60 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.15)]'
                          : 'bg-[#121620] border-stone-800 text-stone-400 hover:border-stone-700 hover:text-white'
                      }`}
                    >
                      <span className="text-sm font-black tracking-tight">{c}</span>
                      <span className="text-[7px] font-black text-stone-600 uppercase tracking-tighter">Credits</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form - Main UI Focus Cyan */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Amount (BDT)</label>
                    {amount && (
                      <span className="text-[9px] font-black text-fuchsia-400 uppercase tracking-tight">
                        {amount} Credits
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-[#121620] border border-stone-800 rounded-2xl px-5 py-4 text-sm font-bold text-white placeholder:text-stone-700 focus:outline-none focus:border-[#00f3ff]/50 focus:bg-[#00f3ff]/5 transition-all shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Transaction ID</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter TRX ID"
                    required
                    className="w-full bg-[#121620] border border-stone-800 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-white placeholder:text-stone-700 focus:outline-none focus:border-[#00f3ff]/50 focus:bg-[#00f3ff]/5 transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !settings?.[selectedMethod]}
                  className="w-full mt-4 bg-gradient-to-r from-[#00f3ff] to-cyan-600 hover:brightness-110 disabled:grayscale disabled:opacity-30 text-stone-950 font-black py-4.5 rounded-[18px] text-[13px] uppercase tracking-[0.15em] transition-all shadow-[0_10px_25px_rgba(0,243,255,0.25)] flex items-center justify-center gap-2 active:scale-[0.97]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* History - Modern Dark List */
            <div className="flex flex-col gap-3.5">
              {requests.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center border border-stone-800/50">
                    <Clock className="w-8 h-8 text-stone-800" />
                  </div>
                  <p className="text-[11px] font-bold text-stone-600 uppercase tracking-widest">No transaction data</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="bg-[#121620]/60 border border-stone-800/60 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:bg-[#121620] hover:border-stone-700 transition-all">
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#00f3ff]/80">{req.method}</span>
                        <span className="text-[10px] font-mono text-stone-600 truncate">{req.transactionId}</span>
                      </div>
                      <span className="text-[15px] font-black text-white tracking-tight">{req.amount} BDT</span>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {req.status === 'pending' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                          <Clock className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-tight">Pending</span>
                        </div>
                      )}
                      {req.status === 'completed' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.05)]">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-tight">Success</span>
                        </div>
                      )}
                      {req.status === 'rejected' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/5 border border-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-tight">Failed</span>
                        </div>
                      )}
                      <span className="text-[8px] text-stone-700 font-bold uppercase tracking-widest">
                        {req.createdAt && (req.createdAt as any).toDate ? (req.createdAt as any).toDate().toLocaleDateString('en-GB') : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Accent - Magenta (Final touch) */}
        <div className="p-3 bg-fuchsia-500/5 border-t border-stone-900 text-center">
           <span className="text-[8px] font-black uppercase tracking-[0.3em] text-fuchsia-500/40">Secure Encryption Enabled</span>
        </div>
      </div>
    </div>
  );
};
