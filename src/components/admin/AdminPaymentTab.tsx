
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { getAllUsers, updateUserSubscription } from '../../services/userService';
import { paymentService } from '../../services/paymentService';
import { Button } from '../Button';
import { Input } from '../Input';
import { SearchIcon, CashIcon, UserIcon, LockClosedIcon } from '../icons';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../Modal';

// Premium Toggle Switch Component
const Switch = ({ checked, onChange, label, disabled = false }: { checked: boolean, onChange: (val: boolean) => void, label: string, disabled?: boolean }) => (
    <div className="flex items-center justify-between py-3">
        <span className="text-gray-700 font-medium text-sm">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                backgroundColor: checked ? '#22c55e' : '#d1d5db',
                position: 'relative',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'background-color 0.2s ease',
                border: 'none',
                outline: 'none',
                padding: 0,
            }}
        >
            <span
                style={{
                    display: 'block',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    position: 'absolute',
                    top: '3px',
                    left: checked ? '27px' : '3px',
                    transition: 'left 0.2s ease',
                }}
            />
        </button>
    </div>
);

export const AdminPaymentTab: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);

    // Remote Config (Source of Truth)
    const [config, setConfig] = useState({
        enablePosterPayment: false,
        enableViewerPayment: false,
        postJobPrice: 10,
        subscriptionPrice: 15,
        singleContactPrice: 5,
        adminPassword: '32817'
    });

    // Local Edits for Prices (Manual Save)
    const [localPrices, setLocalPrices] = useState({
        postJobPrice: '10',
        subscriptionPrice: '15',
        singleContactPrice: '5'
    });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [transactions, setTransactions] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [revenue, setRevenue] = useState({ total: 0, monthly: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    // Security Modals
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [pendingAction, setPendingAction] = useState<{ type: 'toggle' | 'save_prices', key?: string, value?: any } | null>(null);

    // Change Password Modal
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    const isSuperAdmin = currentUser?.email === 'eyceyceyc139@gmail.com';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const configRef = doc(db, 'config', 'paymentSettings');
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data() as any;
                    setConfig({ ...config, ...data });
                    setLocalPrices({
                        postJobPrice: String(data.postJobPrice ?? 10),
                        subscriptionPrice: String(data.subscriptionPrice ?? 15),
                        singleContactPrice: String(data.singleContactPrice ?? 5)
                    });
                } else {
                    await setDoc(configRef, config);
                }

                const txs = await paymentService.getTransactions();
                setTransactions(txs);

                const totalRev = txs.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
                const now = new Date();
                const monthlyRev = txs
                    .filter(tx => {
                        const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : (tx.date ? new Date(tx.date) : null);
                        return txDate && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
                    })
                    .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

                setRevenue({ total: totalRev, monthly: monthlyRev });

                const allUsers = await getAllUsers();
                setUsers(allUsers);

            } catch (err) {
                console.error("Error loading admin payment data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Handle Local Price Changes (String-based to allow empty field)
    const handlePriceChange = (key: keyof typeof localPrices, value: string) => {
        setLocalPrices(prev => ({ ...prev, [key]: value }));
        setHasUnsavedChanges(true);
    };

    // Execute Actions (Write to DB)
    const executeAction = async (action: { type: 'toggle' | 'save_prices' | 'password', key?: string, value?: any }) => {
        let newConfig: any = { ...config };

        if (action.type === 'toggle' && action.key) {
            newConfig[action.key] = action.value;
        } else if (action.type === 'save_prices') {
            newConfig.postJobPrice = Number(localPrices.postJobPrice) || 0;
            newConfig.subscriptionPrice = Number(localPrices.subscriptionPrice) || 0;
            newConfig.singleContactPrice = Number(localPrices.singleContactPrice) || 0;
            setHasUnsavedChanges(false);
        } else if (action.type === 'password') {
            newConfig.adminPassword = action.value;
        }

        setConfig(newConfig);
        try {
            await setDoc(doc(db, 'config', 'paymentSettings'), newConfig, { merge: true });
        } catch (err) {
            console.error("Error updating config:", err);
            alert('שגיאה בשמירת הנתונים');
        }
    };

    const handleProtectedAction = (type: 'toggle' | 'save_prices', key?: string, value?: any) => {
        if (isSuperAdmin) {
            executeAction({ type, key, value });
        } else {
            setPendingAction({ type, key, value });
            setPasswordInput('');
            setShowPasswordModal(true);
        }
    };

    const verifyPassword = () => {
        if (passwordInput === config.adminPassword) {
            if (pendingAction) {
                executeAction(pendingAction);
                setPendingAction(null);
            }
            setShowPasswordModal(false);
        } else {
            alert('סיסמה שגויה');
        }
    };

    const handleChangeAdminPassword = async () => {
        if (!newPassword || newPassword.length < 4) {
            alert('סיסמה חייבת להיות לפחות 4 תווים');
            return;
        }
        await executeAction({ type: 'password', value: newPassword });
        setShowChangePasswordModal(false);
        setNewPassword('');
        alert('הסיסמה שונתה בהצלחה');
    };

    const handleTogglePro = async (user: User) => {
        const isPro = user.subscription?.isActive && new Date(user.subscription.expiresAt) > new Date();
        const newStatus = !isPro;
        try {
            setUsers(users.map(u => u.id === user.id ? {
                ...u,
                subscription: newStatus ? {
                    isActive: true,
                    plan: 'monthly',
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    startedAt: new Date().toISOString()
                } : undefined
            } : u));
            await updateUserSubscription(user.id, newStatus ? {
                isActive: true,
                plan: 'monthly',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            } : null);
        } catch (err) {
            console.error("Error toggling pro status:", err);
        }
    };

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center animate-pulse">טוען נתונים...</div>;

    return (
        <div className="space-y-8 animate-fade-in text-right" dir="rtl">

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-green-100 text-sm mb-1">הכנסות החודש</p>
                    <h3 className="text-4xl font-bold">₪{revenue.monthly}</h3>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-blue-100 text-sm mb-1">סה"כ הכנסות</p>
                    <h3 className="text-4xl font-bold">₪{revenue.total}</h3>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-purple-100 text-sm mb-1">מנויים פעילים</p>
                    <h3 className="text-4xl font-bold">
                        {users.filter(u => u.subscription?.isActive && new Date(u.subscription.expiresAt) > new Date()).length}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Toggles */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-full flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3 flex items-center">
                            <LockClosedIcon className="w-5 h-5 ml-2 text-royal-blue" />
                            הגדרות מערכת (נדרשת הרשאה)
                        </h2>
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                                <Switch
                                    label="הפעלת תשלום למפרסמים (Pay to Post)"
                                    checked={config.enablePosterPayment}
                                    onChange={(v) => handleProtectedAction('toggle', 'enablePosterPayment', v)}
                                />
                                <p className="text-xs text-gray-500 mt-2">כאשר פעיל, חובה לשלם כדי לפרסם משרה.</p>
                            </div>
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                                <Switch
                                    label="הפעלת תשלום למחפשים (Pay to View)"
                                    checked={config.enableViewerPayment}
                                    onChange={(v) => handleProtectedAction('toggle', 'enableViewerPayment', v)}
                                />
                                <p className="text-xs text-gray-500 mt-2">כאשר פעיל, חובה לשלם לצפייה בפרטי קשר.</p>
                            </div>
                        </div>
                    </div>

                    {isSuperAdmin && (
                        <div className="mt-8 pt-4 border-t border-gray-200">
                            <Button
                                variant="outline"
                                onClick={() => setShowChangePasswordModal(true)}
                                className="w-full justify-center text-sm"
                            >
                                🔐 שינוי סיסמת מנהלים
                            </Button>
                        </div>
                    )}
                </div>

                {/* Pricing Management - Premium Design */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-full flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3 flex items-center">
                        <CashIcon className="w-5 h-5 ml-2 text-green-600" />
                        ניהול מחירון
                    </h2>

                    <div className="flex-1 space-y-5">
                        {/* Post Job Price */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800">📝 פרסום משרה</label>
                                    <p className="text-xs text-gray-500">עלות פרסום משרה חדשה</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
                                    <span className="text-gray-400 font-bold">₪</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={localPrices.postJobPrice}
                                        onChange={(e) => handlePriceChange('postJobPrice', e.target.value)}
                                        className="w-20 text-center font-bold text-lg border-none outline-none bg-transparent"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Subscription Price */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800">⭐ מנוי PRO חודשי</label>
                                    <p className="text-xs text-gray-500">גישה בלתי מוגבלת לכל המשרות</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
                                    <span className="text-gray-400 font-bold">₪</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={localPrices.subscriptionPrice}
                                        onChange={(e) => handlePriceChange('subscriptionPrice', e.target.value)}
                                        className="w-20 text-center font-bold text-lg border-none outline-none bg-transparent"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Single Contact Price */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800">👁️ חשיפה בודדת</label>
                                    <p className="text-xs text-gray-500">צפייה בפרטי קשר של משרה אחת</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
                                    <span className="text-gray-400 font-bold">₪</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={localPrices.singleContactPrice}
                                        onChange={(e) => handlePriceChange('singleContactPrice', e.target.value)}
                                        className="w-20 text-center font-bold text-lg border-none outline-none bg-transparent"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => handleProtectedAction('save_prices')}
                            disabled={!hasUnsavedChanges}
                            className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 ${hasUnsavedChanges
                                ? 'bg-gradient-to-r from-royal-blue to-indigo-600 hover:from-indigo-600 hover:to-royal-blue shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                                : 'bg-gray-300 cursor-not-allowed'
                                }`}
                        >
                            💾 {hasUnsavedChanges ? 'שמור שינויים במחירון' : 'אין שינויים לשמירה'}
                        </button>
                    </div>
                </div>
            </div>

            {/* User Subscription Management */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">ניהול מנויי משתמשים</h2>
                    <div className="w-64">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="חיפוש..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-blue text-sm"
                            />
                            <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תוקף</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.slice(0, 50).map((user) => {
                                const isPro = user.subscription?.isActive && new Date(user.subscription.expiresAt) > new Date();
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.fullName || 'ללא שם'}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isPro ?
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">פעיל</span> :
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">לא פעיל</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {isPro ? new Date(user.subscription!.expiresAt).toLocaleDateString('he-IL') : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleTogglePro(user)}
                                                className={`text-sm font-semibold underline ${isPro ? 'text-red-600 hover:text-red-900' : 'text-royal-blue hover:text-blue-900'}`}
                                            >
                                                {isPro ? 'בטל מנוי' : 'הפוך למנוי'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Log */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">היסטוריית עסקאות אחרונות</h2>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תאריך</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">פריט</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">לקוח</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סכום</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ID</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((tx) => (
                                <tr key={tx.id || tx.paypalOrderId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" dir="ltr">
                                        {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleDateString('he-IL') : (tx.date ? new Date(tx.date).toLocaleDateString('he-IL') : '-')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {tx.itemType || tx.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="text-sm font-medium text-gray-900">{tx.userEmail}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                        {tx.amount} {tx.currency}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono text-xs">
                                        {tx.paypalOrderId?.substring(0, 10)}...
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Password Verification Modal - Premium Redesign */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                title=""
                size="sm"
            >
                <div className="text-center p-2">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                        <LockClosedIcon className="h-8 w-8 text-royal-blue" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">אימות מנהל נדרש</h3>
                    <p className="text-sm text-gray-500 mb-8">
                        שינוי זה דורש הרשאת מנהל.<br />נא להקליד סיסמה להמשך.
                    </p>

                    <div className="mb-6 relative">
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="block w-full px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-royal-blue/20 focus:border-royal-blue transition-all outline-none bg-gray-50 focus:bg-white"
                            placeholder="••••"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setShowPasswordModal(false)}
                            className="w-full py-3 px-4 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 outline-none"
                        >
                            ביטול
                        </button>
                        <button
                            onClick={verifyPassword}
                            disabled={!passwordInput}
                            className={`w-full py-3 px-4 rounded-xl text-white font-medium shadow-md transition-all focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue outline-none ${passwordInput
                                    ? 'bg-royal-blue hover:bg-blue-700 hover:shadow-lg transform active:scale-95'
                                    : 'bg-gray-400 cursor-not-allowed'
                                }`}
                        >
                            מאשר
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Change Password Modal */}
            <Modal isOpen={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} title="🔐 שינוי סיסמת ניהול">
                <div className="p-6">
                    <p className="mb-4 text-gray-600">הזן סיסמה חדשה למנהלים זוטרים:</p>
                    <Input
                        type="password"
                        placeholder="סיסמה חדשה..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mb-4"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowChangePasswordModal(false)}>ביטול</Button>
                        <Button variant="primary" onClick={handleChangeAdminPassword}>שמור סיסמה</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};
