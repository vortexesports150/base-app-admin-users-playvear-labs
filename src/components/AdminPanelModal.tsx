import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  ShieldCheck,
  Zap,
  CreditCard,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Clock,
  User as UserIcon,
  MoreVertical,
  Search,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Ban
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc, 
  Timestamp, 
  limit, 
  startAfter, 
  getDocs, 
  getCountFromServer,
  getAggregateFromServer,
  sum,
  where
} from 'firebase/firestore';

export interface KeyPoolInfo {
  id: string;
  index: number;
  label: string;
  maskedKey: string;
  source: 'env' | 'custom';
  charCountUsed: number;
  maxCharsLimit: number;
  status: 'active' | 'standby' | 'exhausted' | 'rate_limited' | 'error';
  lastUsedAt: string | null;
  errorMessage?: string;
  accountEmail?: string;
  accountDetails?: string;
  customVoicesCount?: number;
  adminKeyMasked?: string;
  cachedCredits?: any;
}

export interface RotatorStatusPayload {
  totalKeys: number;
  activeKeyIndex: number;
  totalCharsUsed: number;
  totalCapacity: number;
  remainingChars: number;
  hasPaidKey?: boolean;
  paidKey?: KeyPoolInfo | null;
  keys: KeyPoolInfo[];
}

export interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey?: string;
  onSaveApiKey?: (key: string) => void;
  paidApiKey?: string;
  onSavePaidApiKey?: (key: string) => void;
  onKeySwitched?: (newKeyIndex: number) => void;
  userEmail?: string;
}

interface ParsedCreditInfo {
  text: string;
  used?: string;
  percent?: number;
  isError?: boolean;
}

interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  credits: number;
  method: 'bkash' | 'nagad' | 'rocket';
  transactionId: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: any;
}

function parseCredits(data: any): ParsedCreditInfo {
  if (!data) return { text: '' };
  if (typeof data === 'string') return { text: data };
  if (typeof data.remaining === 'string') {
    return {
      text: data.remaining,
      used: data.used || (typeof data.totalUsedCredits === 'number' ? `${data.totalUsedCredits.toLocaleString()} used` : undefined),
      percent: typeof data.remainingPercent === 'number' ? data.remainingPercent : undefined,
    };
  }
  if (typeof data.remainingCredits === 'number') {
    return {
      text: `${data.remainingCredits.toLocaleString()} credits remaining`,
      used: typeof data.totalUsedCredits === 'number' ? `${data.totalUsedCredits.toLocaleString()} used` : undefined,
    };
  }
  if (typeof data.text === 'string') {
    return {
      text: data.text,
      used: data.used,
      percent: data.remainingPercent,
    };
  }
  if (Array.isArray(data.data)) {
    const sum = data.data.reduce((acc: number, b: any) => acc + (Number(b?.credits) || 0), 0);
    const max = 1000000;
    const remaining = Math.max(0, max - sum);
    return {
      text: `${remaining.toLocaleString()} credits remaining`,
      used: `${sum.toLocaleString()} credits used`,
    };
  }
  if (typeof data.totalUsedCredits === 'number') {
    const max = 1000000;
    const remaining = Math.max(0, max - data.totalUsedCredits);
    return {
      text: `${remaining.toLocaleString()} credits remaining`,
      used: `${data.totalUsedCredits.toLocaleString()} credits used`,
    };
  }
  if (typeof data.credits === 'number') {
    return { text: `${data.credits.toLocaleString()} credits remaining` };
  }
  if (typeof data.remaining === 'number') return { text: `$${data.remaining.toFixed(2)} remaining` };
  if (typeof data.balance === 'number') return { text: `$${data.balance.toFixed(2)} balance` };
  if (data.message) return { text: data.message };
  return { text: 'Active' };
}

function formatDate(val: any): string {
  if (!val) return 'N/A';
  if (typeof val === 'string') return new Date(val).toLocaleString();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000).toLocaleString();
  if (val instanceof Date) return val.toLocaleString();
  return 'N/A';
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentApiKey = '',
  onSaveApiKey,
  paidApiKey = '',
  onSavePaidApiKey,
  onKeySwitched,
  userEmail = '',
}) => {
  const [activeTab, setActiveTab] = useState<'rotator' | 'payments' | 'business' | 'history' | 'users' | 'settings'>('rotator');
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [poolData, setPoolData] = useState<RotatorStatusPayload | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [switchingIndex, setSwitchingIndex] = useState<number | null>(null);
  const [checkingCreditKey, setCheckingCreditKey] = useState<number | 'paid' | null>(null);

  const [adminKeys, setAdminKeys] = useState<{ [keyIndex: string]: string }>({});
  const [creditResults, setCreditResults] = useState<{ [keyIndex: string]: ParsedCreditInfo }>({});

  const [paidKeyInput, setPaidKeyInput] = useState(paidApiKey);
  const [customKeyInput, setCustomKeyInput] = useState(currentApiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedPaidSuccess, setSavedPaidSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Payment Management States
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>({});
  const [pricingSettings, setPricingSettings] = useState<any>({ heygenRate: 2.64, v4CharRate: 7.2 });
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState<string | null>(null);

  // Generation History States
  const [genHistory, setGenHistory] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [historySubTab, setHistorySubTab] = useState<'voice' | 'video'>('voice');
  const [profitChartFilter, setProfitChartFilter] = useState<'all' | 'voice' | 'video'>('all');

  // Payment Pagination States
  const [paymentPage, setPaymentPage] = useState(1);
  const [lastPaymentDoc, setLastPaymentDoc] = useState<any>(null);
  const [firstPaymentDoc, setFirstPaymentDoc] = useState<any>(null);
  const [paymentStack, setPaymentDocsStack] = useState<any[]>([]); // Stores the first doc of each visited page
  const [hasMorePayments, setHasMorePayments] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [totalIncomeState, setTotalIncomeState] = useState(0);

  // Users Tab States
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 20;

  // Calculate Income
  const totalHistoryProfit = genHistory
    .reduce((sum, h) => sum + (Number(h.profit) || 0), 0);

  const loadStoredAdminKeys = () => {
    const loaded: { [idx: string]: string } = {};
    for (let i = 0; i <= 20; i++) {
      try {
        const val = localStorage.getItem(`playvear_admin_key_${i}`);
        if (val) loaded[String(i)] = val;
      } catch (e) {}
    }
    try {
      const paidVal = localStorage.getItem(`playvear_admin_key_paid`) || localStorage.getItem(`playvear_admin_key_0`);
      if (paidVal) {
        loaded['paid'] = paidVal;
        loaded['0'] = paidVal;
      }
    } catch (e) {}
    setAdminKeys(loaded);
  };

  const fetchPoolStatus = async () => {
    setIsLoadingPool(true);
    try {
      const res = await fetch('/api/cartesia-rotator/status');
      if (res.ok) {
        const data: RotatorStatusPayload = await res.json();
        setPoolData(data);
        const preloadedCredits: { [idx: string]: ParsedCreditInfo } = {};
        if (data.keys) {
          data.keys.forEach((k) => {
            if (k.cachedCredits) {
              const parsed = parseCredits(k.cachedCredits);
              if (parsed?.text) preloadedCredits[String(k.index)] = parsed;
            }
          });
        }
        if (data.paidKey?.cachedCredits) {
          const parsedPaid = parseCredits(data.paidKey.cachedCredits);
          if (parsedPaid?.text) {
            preloadedCredits['paid'] = parsedPaid;
            preloadedCredits['0'] = parsedPaid;
          }
        }
        setCreditResults((prev) => ({ ...preloadedCredits, ...prev }));
      }
    } catch (err) {
      console.warn('Failed to fetch admin pool status:', err);
    } finally {
      setIsLoadingPool(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStoredAdminKeys();
      fetchPoolStatus();
      setPaidKeyInput(paidApiKey);
      setCustomKeyInput(currentApiKey);

      const isAdmin = userEmail === 'vortexesports150@gmail.com';

      let unsubscribePayments: (() => void) | undefined;
      let unsubscribeSettings: (() => void) | undefined;
      let unsubscribePricing: (() => void) | undefined;
      let unsubscribeHistory: (() => void) | undefined;
      let unsubscribeUsers: (() => void) | undefined;

      if (isAdmin) {
        // Initial Fetch for Payments (First Page)
        fetchPayments('first');
        fetchTotalIncome();

        // Generation History Listener - Only for Admin
        unsubscribeHistory = onSnapshot(
          query(collection(db, 'generation_history'), orderBy('createdAt', 'desc')),
          (snapshot) => {
            setGenHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        );

        // Users Listener - Only for Admin
        unsubscribeUsers = onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        );
      }

      // Settings Listener - Available for all signed in users (for viewing payment numbers)
      unsubscribeSettings = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
        if (doc.exists()) setPaymentSettings(doc.data());
      });

      // Pricing Listener
      unsubscribePricing = onSnapshot(doc(db, 'settings', 'pricing'), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const hRate = typeof data?.heygenRate === 'number' && data.heygenRate > 0 && data.heygenRate < 50 ? data.heygenRate : 2.64;
          const vRate = typeof data?.v4CharRate === 'number' && data.v4CharRate > 0 && data.v4CharRate < 100 ? data.v4CharRate : 7.2;
          setPricingSettings({ heygenRate: hRate, v4CharRate: vRate });
        }
      });

      const timer = setTimeout(() => handleCheckCredits('paid'), 50);
      return () => {
        clearTimeout(timer);
        if (unsubscribePayments) unsubscribePayments();
        if (unsubscribeSettings) unsubscribeSettings();
        if (unsubscribePricing) unsubscribePricing();
        if (unsubscribeHistory) unsubscribeHistory();
        if (unsubscribeUsers) unsubscribeUsers();
      };
    }
  }, [isOpen, paidApiKey, currentApiKey, userEmail]);

  const handleAdminKeyChange = (indexKey: string, value: string) => {
    setAdminKeys((prev) => ({
      ...prev,
      [indexKey]: value,
      ...(indexKey === 'paid' ? { '0': value } : {}),
      ...(indexKey === '0' ? { 'paid': value } : {}),
    }));
    try {
      localStorage.setItem(`playvear_admin_key_${indexKey}`, value.trim());
      if (indexKey === 'paid') localStorage.setItem(`playvear_admin_key_0`, value.trim());
      if (indexKey === '0') localStorage.setItem(`playvear_admin_key_paid`, value.trim());
    } catch (e) {}
  };

  const handleCheckCredits = async (keyIdentifier: number | 'paid') => {
    const stringKey = String(keyIdentifier);
    let adminKeyToUse = (adminKeys[stringKey] || '').trim();
    if (keyIdentifier === 'paid') {
      if (!adminKeyToUse) adminKeyToUse = (adminKeys['0'] || '').trim();
      if (!adminKeyToUse && paidKeyInput.trim().startsWith('sk_car_admin_')) adminKeyToUse = paidKeyInput.trim();
    }
    setCheckingCreditKey(keyIdentifier);
    try {
      const res = await fetch('/api/cartesia-rotator/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyIndex: keyIdentifier, adminKey: adminKeyToUse }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const parsed = parseCredits(data.data);
        setCreditResults((prev) => ({
          ...prev,
          [stringKey]: parsed,
          ...(keyIdentifier === 'paid' ? { '0': parsed } : {}),
        }));
        if (data.status) setPoolData(data.status);
      } else {
        setCreditResults((prev) => ({
          ...prev,
          [stringKey]: { text: data.error || data.message || 'Error checking', isError: true },
        }));
      }
    } catch (err: any) {
      setCreditResults((prev) => ({ ...prev, [stringKey]: { text: err?.message || 'Check failed', isError: true } }));
    } finally {
      setCheckingCreditKey(null);
    }
  };

  const handleManualSwitch = async (index: number) => {
    setSwitchingIndex(index);
    try {
      const res = await fetch('/api/cartesia-rotator/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      if (res.ok) {
        await fetchPoolStatus();
        onKeySwitched?.(index);
      }
    } catch (err) {
      console.warn('Switch key error:', err);
    } finally {
      setSwitchingIndex(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setIsProcessingAction(requestId);
    try {
      await updateDoc(doc(db, 'payment_requests', requestId), {
        status: 'rejected',
        updatedAt: Timestamp.now()
      });
      // Refresh current page to show updated status
      fetchPayments('refresh');
    } catch (error) {
      console.error('Rejection error:', error);
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleApproveRequest = async (request: PaymentRequest) => {
    setIsProcessingAction(request.id);
    try {
      // 1. Update User Credits
      const userRef = doc(db, 'users', request.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          credits: increment(request.credits),
          updatedAt: Timestamp.now()
        });
      } else {
        await setDoc(userRef, {
          uid: request.userId,
          email: request.userEmail,
          credits: request.credits,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      // 2. Update Request Status
      await updateDoc(doc(db, 'payment_requests', request.id), {
        status: 'completed',
        updatedAt: Timestamp.now()
      });

      // 3. Refresh data
      fetchPayments('refresh');
      fetchTotalIncome();
    } catch (error) {
      console.error('Approval error:', error);
    } finally {
      setIsProcessingAction(null);
    }
  };

  const fetchTotalIncome = async () => {
    try {
      const q = query(collection(db, 'payment_requests'), where('status', '==', 'completed'));
      const snapshot = await getAggregateFromServer(q, {
        total: sum('amount')
      });
      setTotalIncomeState(snapshot.data().total || 0);
    } catch (err) {
      console.warn('Failed to fetch total income aggregation:', err);
      // Fallback: manual sum if aggregation not supported/failed
      const snap = await getDocs(query(collection(db, 'payment_requests'), where('status', '==', 'completed')));
      const total = snap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
      setTotalIncomeState(total);
    }
  };

  const fetchPayments = async (direction: 'next' | 'prev' | 'first' | 'refresh' = 'first') => {
    setIsLoadingPayments(true);
    try {
      const paymentsRef = collection(db, 'payment_requests');
      let q;

      if (direction === 'first') {
        q = query(paymentsRef, orderBy('createdAt', 'desc'), limit(20));
        setPaymentPage(1);
        setPaymentDocsStack([]);
      } else if (direction === 'refresh') {
        // If refreshing, start from the first doc of current page
        const startDoc = paymentStack[paymentPage - 1] || null;
        if (startDoc) {
          q = query(paymentsRef, orderBy('createdAt', 'desc'), startAfter(startDoc), limit(20));
        } else {
          q = query(paymentsRef, orderBy('createdAt', 'desc'), limit(20));
        }
      } else if (direction === 'next' && lastPaymentDoc) {
        q = query(paymentsRef, orderBy('createdAt', 'desc'), startAfter(lastPaymentDoc), limit(20));
        setPaymentPage(p => p + 1);
        setPaymentDocsStack(prev => [...prev, lastPaymentDoc]);
      } else if (direction === 'prev' && paymentPage > 1) {
        const prevDoc = paymentStack[paymentPage - 3] || null; // Stack stores docs to START AFTER
        if (prevDoc) {
          q = query(paymentsRef, orderBy('createdAt', 'desc'), startAfter(prevDoc), limit(20));
        } else {
          q = query(paymentsRef, orderBy('createdAt', 'desc'), limit(20));
        }
        setPaymentPage(p => p - 1);
        setPaymentDocsStack(prev => prev.slice(0, -1));
      } else {
        setIsLoadingPayments(false);
        return;
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
      setPaymentRequests(results);
      setLastPaymentDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMorePayments(snapshot.docs.length === 20);
    } catch (err) {
      console.warn('Error fetching paginated payments:', err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleToggleBlockUser = async (userId: string, currentStatus: boolean) => {
    setIsProcessingAction(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBlocked: !currentStatus,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error toggling block status:', error);
    } finally {
      setIsProcessingAction(null);
    }
  };


  const handleSavePricing = async () => {
    setIsSavingPricing(true);
    try {
      const hRate = typeof pricingSettings.heygenRate === 'number' && pricingSettings.heygenRate > 0 ? pricingSettings.heygenRate : 2.64;
      const vRate = typeof pricingSettings.v4CharRate === 'number' && pricingSettings.v4CharRate > 0 ? pricingSettings.v4CharRate : 7.2;
      const payload = { heygenRate: hRate, v4CharRate: vRate };
      await setDoc(doc(db, 'settings', 'pricing'), payload, { merge: true });
      setPricingSettings(payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      console.error('Pricing update error:', error);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleResetRecommended = () => {
    setPricingSettings({ heygenRate: 2.64, v4CharRate: 7.2 });
  };

  const handleSavePaymentSettings = async () => {
    setIsSavingPayment('all');
    try {
      for (const method of ['bkash', 'nagad', 'rocket'] as const) {
        if (paymentSettings[method]) {
          await setDoc(doc(db, 'settings', 'payment'), {
            [method]: paymentSettings[method]
          }, { merge: true });
        }
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      console.error('Payment settings update error:', error);
    } finally {
      setIsSavingPayment(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black backdrop-blur-xl flex flex-col overflow-hidden">
      <div className="w-full h-full bg-[#070b13] flex flex-col overflow-hidden relative">
        
        {/* Full Screen Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 bg-[#0a101b] p-3 px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tighter uppercase">Admin Control Center</h2>
              <p className="text-[8px] sm:text-[9px] text-cyan-500 font-bold tracking-widest uppercase opacity-80">{activeTab}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Three Dot Navigation Menu */}
            <div className="relative">
              <button
                onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shadow-lg active:scale-95 ${
                  isNavMenuOpen 
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-cyan-400 hover:border-cyan-500/30'
                }`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isNavMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNavMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#0d121d] border border-cyan-500/40 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 p-1.5 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    {[
                      { id: 'rotator', label: 'API Key Rotator', icon: RefreshCw },
                      { id: 'payments', label: 'Payment Requests', icon: CreditCard },
                      { id: 'business', label: 'Business & Profit', icon: ShieldCheck },
                      { id: 'history', label: 'Generation History', icon: Clock },
                      { id: 'users', label: 'User Management', icon: UserIcon },
                      { id: 'settings', label: 'System Settings', icon: Settings }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setIsNavMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold tracking-wide transition-all flex items-center gap-3 ${
                          activeTab === tab.id
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                        }`}
                      >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-cyan-400' : 'text-stone-500'}`} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={onClose} 
              className="p-2.5 bg-stone-900 hover:bg-rose-950/30 text-stone-400 hover:text-rose-400 rounded-xl border border-stone-800 hover:border-rose-900/50 transition-all flex items-center justify-center shadow-lg active:scale-95"
              title="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          {activeTab === 'rotator' && (
            <div className="space-y-4">
              {poolData?.paidKey && (
                <div className="p-4 rounded-xl border border-fuchsia-500/50 bg-fuchsia-500/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-2 tracking-widest">
                        <Zap className="w-3 h-3" /> PAID KEY
                      </span>
                      <span className="text-[8px] font-mono text-fuchsia-500/80">
                        Remaining: {(poolData.paidKey.maxCharsLimit - poolData.paidKey.charCountUsed).toLocaleString()} chars
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20">
                      {poolData.paidKey.maskedKey}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={adminKeys['paid'] || ''}
                      onChange={(e) => handleAdminKeyChange('paid', e.target.value)}
                      placeholder="sk_car_admin_..."
                      className="flex-1 bg-black/40 border border-fuchsia-900/50 rounded px-3 py-1.5 text-[10px] text-fuchsia-200"
                    />
                    <button
                      onClick={() => handleCheckCredits('paid')}
                      className="px-3 py-1.5 bg-fuchsia-600 text-white rounded text-[10px] font-bold flex items-center gap-1.5 hover:bg-fuchsia-500"
                    >
                      {checkingCreditKey === 'paid' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Check
                    </button>
                  </div>
                  {creditResults['paid'] && (
                    <p className="text-[9px] font-mono text-cyan-400">{creditResults['paid'].text}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {poolData?.keys.map((k) => (
                  <div key={k.index} className={`p-3 rounded-xl border ${k.index === poolData.activeKeyIndex ? 'bg-cyan-500/5 border-cyan-500/40' : 'bg-stone-900/20 border-stone-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">ENV #{k.index}</span>
                        <span className="text-[8px] font-mono text-cyan-500/80">
                          Remaining: {(k.maxCharsLimit - k.charCountUsed).toLocaleString()} chars
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${k.index === poolData.activeKeyIndex ? 'bg-cyan-500/20 text-cyan-400' : 'bg-stone-800 text-stone-500'}`}>
                          {k.index === poolData.activeKeyIndex ? 'ACTIVE' : 'STANDBY'}
                        </span>
                        {k.index !== poolData.activeKeyIndex && (
                          <button
                            onClick={() => handleManualSwitch(k.index)}
                            className="text-[9px] font-bold text-cyan-400 hover:underline"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={adminKeys[k.index] || ''}
                        onChange={(e) => handleAdminKeyChange(String(k.index), e.target.value)}
                        placeholder="sk_car_admin_..."
                        className="flex-1 bg-black/40 border border-stone-800 rounded px-3 py-1 text-[9px] text-stone-300"
                      />
                      <button
                        onClick={() => handleCheckCredits(k.index)}
                        className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded"
                      >
                        <Zap className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 mb-2">
                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Payment Requests Queue</h4>
                {isLoadingPayments && <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin" />}
              </div>

              {paymentRequests.length === 0 ? (
                <div className="py-20 text-center text-stone-500 text-xs">No payment requests found.</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paymentRequests.map((req) => (
                      <div key={req.id} className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${req.status === 'pending' ? 'bg-[#0c111a] border-cyan-900/30 shadow-[0_0_15px_rgba(0,243,255,0.05)]' : 'bg-[#0c111a] border-stone-800 opacity-80'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5 text-stone-500" />
                            <span className="text-[10px] font-bold text-white">{req.userEmail}</span>
                            <span className="text-stone-700 font-bold">•</span>
                            <span className="text-[8px] text-stone-500 font-mono">{formatDate(req.createdAt)}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            req.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                            req.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-rose-500/20 text-rose-500'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded-lg border border-stone-800/50">
                          <div>
                            <p className="text-[9px] uppercase text-stone-500 font-bold mb-1">Details</p>
                            <p className="text-xs font-bold text-cyan-400">{req.amount} BDT / {req.credits} Credits</p>
                            <p className="text-[9px] text-stone-400 font-medium uppercase tracking-tight">{req.method} - {req.transactionId}</p>
                          </div>
                          <div className="flex items-end justify-end gap-2">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleRejectRequest(req.id)}
                                  disabled={isProcessingAction !== null}
                                  className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 transition-all active:scale-90"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleApproveRequest(req)}
                                  disabled={isProcessingAction !== null}
                                  className="flex-1 py-2 bg-cyan-600 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-cyan-500 transition-all active:scale-[0.98]"
                                >
                                  {isProcessingAction === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                  Approve
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-center gap-4 pt-4 pb-2">
                    <button
                      onClick={() => fetchPayments('prev')}
                      disabled={paymentPage === 1 || isLoadingPayments}
                      className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 disabled:opacity-30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                      Page <span className="text-cyan-400">{paymentPage}</span>
                    </div>
                    <button
                      onClick={() => fetchPayments('next')}
                      disabled={!hasMorePayments || isLoadingPayments}
                      className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 disabled:opacity-30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-6">
              {/* Income Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">TOTAL PAYMENT RECEIVED</p>
                  <h3 className="text-2xl font-black text-white flex items-baseline gap-2">
                    {totalIncomeState.toLocaleString()} <span className="text-xs font-bold text-cyan-500/80">BDT</span>
                  </h3>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 shadow-[0_0_25px_rgba(34,197,94,0.1)]">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">TOTAL PROFIT (HISTORY)</p>
                  <h3 className="text-2xl font-black text-white flex items-baseline gap-2">
                    {totalHistoryProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-emerald-500/80">Cr</span>
                  </h3>
                </div>
              </div>

              {/* Pricing Rates */}
              <div className="p-4 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-fuchsia-400 font-bold uppercase text-[9px] tracking-widest">
                    <Zap className="w-3 h-3" /> COSTING & PROFIT SETTINGS
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetRecommended}
                      className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[8px] font-bold rounded-lg transition-all"
                      title="Reset to recommended rates"
                    >
                      RESET RATES
                    </button>
                    <button
                      onClick={handleSavePricing}
                      disabled={isSavingPricing}
                      className="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-[9px] font-black rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(192,38,211,0.3)]"
                    >
                      {isSavingPricing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      {savedSuccess ? 'SAVED' : 'SAVE RATES'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* HeyGen Video Settings */}
                  <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-black/40 border border-stone-800/80">
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                      HeyGen Video (Revenue/Sec)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingSettings?.heygenRate ?? 2.64}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, heygenRate: parseFloat(e.target.value) || 0 })}
                      className="bg-black/80 border border-stone-800 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:border-fuchsia-500/50 outline-none transition-all"
                      placeholder="2.64"
                    />
                    <div className="flex flex-col gap-1 mt-0.5">
                      <p className="text-[10px] text-stone-400 font-medium">
                        API Cost: 2.2 Credits/Sec
                      </p>
                      <p className="text-[10px] text-emerald-400 font-bold">
                        Profit: {((pricingSettings?.heygenRate ?? 2.64) - 2.2).toFixed(2)} Credits/Sec
                      </p>
                    </div>
                  </div>

                  {/* V4 Voice Settings */}
                  <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-black/40 border border-stone-800/80">
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                      V4 Voice (1000 Chars Revenue)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pricingSettings?.v4CharRate ?? 7.2}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, v4CharRate: parseFloat(e.target.value) || 0 })}
                      className="bg-black/80 border border-stone-800 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:border-fuchsia-500/50 outline-none transition-all"
                      placeholder="7.2"
                    />
                    <div className="flex flex-col gap-1 mt-0.5">
                      <p className="text-[10px] text-stone-400 font-medium">
                        API Cost: 6.0 Credits/1000 Chars
                      </p>
                      <p className="text-[10px] text-emerald-400 font-bold">
                        Profit: {((pricingSettings?.v4CharRate ?? 7.2) - 6.0).toFixed(2)} Credits/1000 Chars
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Profit Chart (Tailwind Bar Chart) */}
              <div className="p-5 rounded-2xl border border-stone-800 bg-[#0c111a]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                  <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] text-center sm:text-left">Monthly Profit Trends (Credits)</h4>
                  
                  {/* Profit Type Filter */}
                  <div className="flex gap-1 p-1 bg-black/30 rounded-xl border border-stone-800/50">
                    {(['all', 'voice', 'video'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setProfitChartFilter(f)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                          profitChartFilter === f
                            ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-64 flex items-end justify-around gap-2 px-2 border-b border-stone-800 pb-2 mb-2">
                  {(() => {
                    const months = [];
                    const now = new Date();
                    for (let i = 5; i >= 0; i--) {
                      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
                      const m = d.getUTCMonth();
                      const y = d.getUTCFullYear();
                      
                      const profit = genHistory
                        .filter(h => {
                          const hd = new Date(h.createdAt || Date.now());
                          const isMonthMatch = hd.getUTCMonth() === m && hd.getUTCFullYear() === y;
                          const isTypeMatch = profitChartFilter === 'all' || h.type === profitChartFilter;
                          return isMonthMatch && isTypeMatch;
                        })
                        .reduce((sum, h) => sum + (Number(h.profit) || 0), 0);

                      months.push({ 
                        label: `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`, 
                        profit 
                      });
                    }
                    const maxProfit = Math.max(...months.map(m => m.profit), 1);
                    return months.map((m, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center group cursor-default">
                        <div className="w-full flex flex-col items-center justify-end relative h-56">
                          <span className="absolute -top-6 text-[9px] font-black text-emerald-400 opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                            {m.profit > 0 ? m.profit.toFixed(1) : '0'}
                          </span>
                          <div 
                            className="w-10 sm:w-16 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg border-x border-t border-emerald-300/30 group-hover:from-emerald-500 group-hover:to-emerald-200 transition-all shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                            style={{ height: `${(m.profit / maxProfit) * 100}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-black text-stone-600 mt-2 uppercase tracking-tighter whitespace-nowrap">{m.label}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Users Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">TOTAL LOGGED IN USERS</p>
                  <h3 className="text-3xl font-black text-white flex items-baseline gap-2">
                    {usersList.length.toLocaleString()} <span className="text-xs font-bold text-cyan-500/80">Google Accounts</span>
                  </h3>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/10 border border-fuchsia-500/30 shadow-[0_0_25px_rgba(192,38,211,0.1)]">
                  <p className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest mb-1">NEW USERS (THIS MONTH)</p>
                  <h3 className="text-3xl font-black text-white flex items-baseline gap-2">
                    {(() => {
                      const now = new Date();
                      const currentMonth = now.getUTCMonth();
                      const currentYear = now.getUTCFullYear();
                      return usersList.filter(u => {
                        const d = new Date(u.updatedAt || u.createdAt || Date.now());
                        return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
                      }).length;
                    })().toLocaleString()} <span className="text-xs font-bold text-fuchsia-500/80">Sign-ups</span>
                  </h3>
                </div>
              </div>

              {/* Monthly Registration Chart (Tailwind Bar Chart) */}
              <div className="p-5 rounded-2xl border border-stone-800 bg-[#0c111a]">
                <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mb-8 text-center">User Registration Trends (Last 6 Months)</h4>
                <div className="h-64 flex items-end justify-around gap-2 px-2 border-b border-stone-800 pb-2 mb-2">
                  {(() => {
                    const months = [];
                    const now = new Date();
                    for (let i = 5; i >= 0; i--) {
                      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
                      const m = d.getUTCMonth();
                      const y = d.getUTCFullYear();
                      const count = usersList.filter(u => {
                        const ud = new Date(u.updatedAt || u.createdAt || Date.now());
                        return ud.getUTCMonth() === m && ud.getUTCFullYear() === y;
                      }).length;
                      months.push({ 
                        label: `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`, 
                        count 
                      });
                    }
                    const maxCount = Math.max(...months.map(m => m.count), 1);
                    return months.map((m, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center group cursor-default">
                        <div className="w-full flex flex-col items-center justify-end relative h-56">
                          <span className="absolute -top-6 text-[9px] font-black text-cyan-400 opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">{m.count}</span>
                          <div 
                            className="w-10 sm:w-16 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg border-x border-t border-cyan-300/30 group-hover:from-cyan-500 group-hover:to-cyan-200 transition-all shadow-[0_0_15px_rgba(0,243,255,0.1)]"
                            style={{ height: `${(m.count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-black text-stone-600 mt-2 uppercase tracking-tighter whitespace-nowrap">{m.label}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Users Search & List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">User Management Directory</h4>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input
                      type="text"
                      placeholder="Search by email..."
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full bg-black/40 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-cyan-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                {(() => {
                  const filteredUsers = usersList
                    .filter(u => (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()))
                    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
                  
                  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
                  const startIndex = (userPage - 1) * usersPerPage;
                  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

                  if (filteredUsers.length === 0) {
                    return <div className="py-20 text-center text-stone-500 text-xs">No users found matching "{userSearchTerm}".</div>;
                  }

                  return (
                    <>
                      <div className="space-y-2">
                        {paginatedUsers.map((user) => (
                          <div key={user.id} className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${user.isBlocked ? 'bg-rose-950/10 border-rose-900/30' : 'bg-[#0c111a] border-stone-800 hover:border-cyan-500/30'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${user.isBlocked ? 'bg-rose-500/10 border-rose-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                                {user.photoURL ? (
                                  <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <UserIcon className={`w-5 h-5 ${user.isBlocked ? 'text-rose-400' : 'text-cyan-400'}`} />
                                )}
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white truncate">{user.displayName || user.name || 'Anonymous'}</span>
                                  {user.isBlocked && (
                                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase tracking-tighter">Blocked</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-stone-500 truncate">{user.email}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                              <div className="text-right">
                                <p className="text-xs font-bold text-cyan-500">{user.credits?.toFixed(2) || '0.00'} Credits</p>
                                <p className="text-[8px] text-stone-600 uppercase font-black tracking-tighter">
                                  Active: {formatDate(user.updatedAt || user.createdAt)}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => handleToggleBlockUser(user.id, user.isBlocked)}
                                disabled={isProcessingAction === user.id}
                                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 group ${
                                  user.isBlocked 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20' 
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                                }`}
                                title={user.isBlocked ? 'Unblock User' : 'Block User'}
                              >
                                {isProcessingAction === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : user.isBlocked ? (
                                  <>
                                    <Unlock className="w-4 h-4" />
                                    <span className="text-[10px] font-bold sm:hidden">Unblock</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-4 h-4" />
                                    <span className="text-[10px] font-bold sm:hidden">Block</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                          <button
                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            disabled={userPage === 1}
                            className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 disabled:opacity-30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                            Page <span className="text-cyan-400">{userPage}</span> of <span className="text-white">{totalPages}</span>
                          </div>
                          <button
                            onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                            disabled={userPage === totalPages}
                            className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 disabled:opacity-30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* History Sub-tabs */}
              <div className="flex gap-2 p-1 bg-black/30 rounded-xl border border-stone-800/50 w-fit mx-auto mb-4">
                <button
                  onClick={() => setHistorySubTab('voice')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    historySubTab === 'voice'
                      ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  VOICE GENERATION
                </button>
                <button
                  onClick={() => setHistorySubTab('video')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    historySubTab === 'video'
                      ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(192,38,211,0.4)]'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  VIDEO GENERATION
                </button>
              </div>

              {/* History List */}
              <div className="space-y-2.5">
                {genHistory
                  .filter((h) => h.type === historySubTab)
                  .length === 0 ? (
                  <div className="py-20 text-center text-stone-500 text-xs">
                    No {historySubTab} history found.
                  </div>
                ) : (
                  genHistory
                    .filter((h) => h.type === historySubTab)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-stone-800 bg-[#0c111a] flex flex-col gap-2.5 group hover:border-cyan-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3 h-3 text-stone-500" />
                            <span className="text-[10px] font-bold text-white">
                              {item.userEmail}
                            </span>
                            <span className="text-stone-600 font-bold">•</span>
                            <span className="text-[9px] text-stone-500 font-mono">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                              item.isPaid 
                                ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' 
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {item.isPaid ? 'PAID' : 'FREE'}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-black/40 text-cyan-400 border border-cyan-500/20">
                              {item.model}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-black/20 border border-stone-800/40">
                            <p className="text-[7px] text-stone-500 uppercase font-black tracking-tighter mb-0.5">SIZE</p>
                            <p className="text-[10px] font-bold text-stone-200">
                              {item.type === 'voice' ? `${item.chars || 0} Chars` : `${item.duration || 0} Secs`}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-black/20 border border-stone-800/40">
                            <p className="text-[7px] text-stone-500 uppercase font-black tracking-tighter mb-0.5">API COST</p>
                            <p className="text-[10px] font-bold text-rose-400">
                              {item.cost?.toFixed(2) || '0.00'} <span className="text-[7px]">Cr</span>
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-black/20 border border-stone-800/40">
                            <p className="text-[7px] text-stone-500 uppercase font-black tracking-tighter mb-0.5">CHARGE</p>
                            <p className="text-[10px] font-bold text-cyan-400">
                              {item.charge?.toFixed(2) || '0.00'} <span className="text-[7px]">Cr</span>
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <p className="text-[7px] text-emerald-500 uppercase font-black tracking-tighter mb-0.5">PROFIT</p>
                            <p className="text-[10px] font-bold text-emerald-400">
                              {item.profit?.toFixed(2) || '0.00'} <span className="text-[7px]">Cr</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-xs tracking-wider">
                  <Phone className="w-4 h-4" /> Payment Recipient Settings
                </div>
                <button
                  onClick={handleSavePaymentSettings}
                  disabled={isSavingPayment === 'all'}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  {isSavingPayment === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (savedSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />)}
                  {savedSuccess ? 'Saved' : 'Save All Numbers'}
                </button>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                {(['bkash', 'nagad', 'rocket'] as const).map((method) => (
                   <div key={method} className="p-4 rounded-xl border border-stone-800 bg-[#0c111a] flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[7px] tracking-widest">
                      <Phone className="w-3 h-3" /> {method} Details
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[7px] font-black text-stone-500 uppercase ml-1 tracking-widest">Account Number</label>
                        <input
                          type="text"
                          value={paymentSettings?.[method]?.number || ''}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            [method]: { ...paymentSettings[method], number: e.target.value }
                          })}
                          className="bg-black/60 border border-stone-800 rounded-xl px-4 py-3 text-base font-bold text-white focus:border-cyan-500/50 outline-none transition-all"
                          placeholder="017xxxxxxxx"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[7px] font-black text-stone-500 uppercase ml-1 tracking-widest">Account Type</label>
                        <select
                          value={paymentSettings?.[method]?.type || 'Personal'}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            [method]: { ...paymentSettings[method], type: e.target.value }
                          })}
                          className="bg-black/60 border border-stone-800 rounded-xl px-4 py-3 text-base font-bold text-white focus:outline-none transition-all cursor-pointer appearance-none"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Merchant">Merchant</option>
                          <option value="Agent">Agent</option>
                        </select>
                      </div>
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
