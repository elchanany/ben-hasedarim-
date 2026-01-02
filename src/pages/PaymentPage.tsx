
import React, { useEffect, useState } from 'react';
import { PayPalButtons } from "@paypal/react-paypal-js";
import { CheckCircleIcon, LockClosedIcon, ShieldCheckIcon, CreditCardIcon, ArrowRightIcon } from '../components/icons';
import { Button } from '../components/Button';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PageProps } from '../App';
import { useAuth } from '../hooks/useAuth';
import { usePayPal } from '../contexts/PayPalContext';
import * as jobService from '../services/jobService';
import { unlockJobForUser, addUserSubscription } from '../services/userService';
import { paymentService } from '../services/paymentService';

interface PaymentPageParams {
    type: 'post_job' | 'view_contact' | 'subscription';
    jobId?: string;
    jobTitle?: string;
    amount?: number;
}

export const PaymentPage: React.FC<PageProps> = ({ setCurrentPage, pageParams }) => {
    const { user } = useAuth();
    const { isReady, mode, error: paypalError } = usePayPal();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Extract params with safe defaults
    const type = (pageParams?.type as 'post_job' | 'view_contact' | 'subscription') || 'post_job';
    const jobId = pageParams?.jobId;
    const jobTitle = pageParams?.jobTitle || 'משרה';
    const amount = pageParams?.amount || (type === 'subscription' ? 15 : 5);

    const [marketingContent, setMarketingContent] = useState({
        title: '',
        subtitle: '',
        features: [] as string[],
        gradientFrom: '',
        gradientTo: '',
        icon: <></>
    });

    // Fetch dynamic prices
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const configRef = doc(db, 'config', 'paymentSettings');
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    let newAmount = amount;
                    if (type === 'post_job') newAmount = data.postJobPrice || 10;
                    if (type === 'view_contact') newAmount = data.singleContactPrice || 5;
                    if (type === 'subscription') newAmount = data.subscriptionPrice || 15;

                    // Only update if not explicitly passed via params (params take precedence if we want override, but usually we want DB price)
                    // Actually, let's always use DB price unless specific reason not to
                    // But wait, amount is derived from pageParams...
                    // Let's force update logic here if pageParams.amount was default
                    if (!pageParams?.amount) {
                        // How to set amount? It's a derived const in body...
                        // Need to move amount to state or force re-render
                        // Or better: pass the fetched price to PayPalButtons component
                        // Refactoring to use state for amount
                    }
                }
            } catch (error) {
                console.error("Failed to fetch prices", error);
            }
        };
        fetchPrices();
    }, [type]);

    // START REFACTOR: Amount should be state, not const
    const [currentAmount, setCurrentAmount] = useState(pageParams?.amount || (type === 'subscription' ? 15 : 5));

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const configRef = doc(db, 'config', 'paymentSettings');
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    if (type === 'post_job') setCurrentAmount(data.postJobPrice || 10);
                    if (type === 'view_contact') setCurrentAmount(data.singleContactPrice || 5);
                    if (type === 'subscription') setCurrentAmount(data.subscriptionPrice || 15);
                }
            } catch (error) {
                console.error("Failed to fetch prices", error);
            }
        };
        if (!pageParams?.amount) {
            fetchPrices();
        }
    }, [type, pageParams]);


    useEffect(() => {
        switch (type) {
            case 'post_job':
                setMarketingContent({
                    title: 'פרסום משרה לקהל הייעודי שלך',
                    subtitle: 'הגיע הזמן למצוא את העובד המושלם. פרסם עכשיו ותהנה מחשיפה רחבה לאלפי מחפשי עבודה איכותיים.',
                    features: [
                        'גישה ישירה לוואטסאפ של המועמדים',
                        'פרסום מיידי בלוח המשרות',
                        'חשיפה לאלפי מועמדים רלוונטיים',
                        'ניהול פניות נוח ויעיל'
                    ],
                    gradientFrom: 'from-blue-600',
                    gradientTo: 'to-blue-800',
                    icon: <ShieldCheckIcon className="w-12 h-12 text-white/90" />
                });
                break;
            case 'view_contact':
                setMarketingContent({
                    title: 'פתיחת פרטי קשר למשרה',
                    subtitle: 'מצאת את העבודה שחיפשת? מעולה! פתח את פרטי הקשר עכשיו וצור קשר ישירות עם המעסיק.',
                    features: [
                        'גישה מלאה לטלפון, וואטסאפ ואימייל',
                        'אפשרות לשליחת הודעה בצ\'אט הפנימי',
                        'פנייה ישירה למעסיק ללא תיווך',
                        'חיסכון משמעותי בזמן'
                    ],
                    gradientFrom: 'from-pink-500',
                    gradientTo: 'to-rose-600',
                    icon: <LockClosedIcon className="w-12 h-12 text-white/90" />
                });
                break;
            case 'subscription':
                setMarketingContent({
                    title: 'מנוי חופשי-חודשי ללא הגבלה',
                    subtitle: 'הכי משתלם! פתח את כל המשרות באתר לחודש שלם ותגדיל את הסיכויים שלך למצוא עבודה במהירות.',
                    features: [
                        'גישה חופשית לכל פרטי הקשר (טלפון, וואטסאפ, מייל)',
                        'שליחת הודעות צ\'אט לכל המפרסמים',
                        'ללא הגבלת כמות משרות לחודש',
                        'תוקף ל-30 יום - ביטול בכל רגע'
                    ],
                    gradientFrom: 'from-purple-600',
                    gradientTo: 'to-indigo-700',
                    icon: <CheckCircleIcon className="w-12 h-12 text-white/90" />
                });
                break;
        }
    }, [type]);

    const handleApprove = async (data: any, actions: any) => {
        try {
            setIsProcessing(true);
            const details = await actions.order.capture();

            // Process successful payment based on type
            // Process successful payment based on type
            if (type === 'post_job') {
                const storedJobData = localStorage.getItem('pendingJobDraft');
                if (storedJobData && user) {
                    const jobData = JSON.parse(storedJobData);
                    const finalJobData: any = {
                        ...jobData,
                        isPosted: true,
                        paymentStatus: 'paid',
                        paymentDetails: {
                            orderId: details.id,
                            amount: currentAmount.toString(),
                            paidAt: new Date().toISOString(),
                            userId: user.id
                        }
                    };
                    const addedJob = await jobService.addJob(finalJobData);

                    // Log Transaction
                    await paymentService.logTransaction({
                        userId: user.id,
                        userEmail: user.email || '',
                        amount: currentAmount,
                        currency: 'ILS',
                        paypalOrderId: details.id,
                        paymentStatus: 'COMPLETED',
                        itemType: 'פרסום מודעה',
                        jobId: addedJob.id
                    });

                    localStorage.removeItem('pendingJobDraft'); // Clean up
                    setSuccess(true);
                }
            } else if (type === 'view_contact' && user && jobId) {
                await unlockJobForUser(user.id, jobId);

                // Log Transaction
                await paymentService.logTransaction({
                    userId: user.id,
                    userEmail: user.email || '',
                    amount: amount,
                    currency: 'ILS',
                    paypalOrderId: details.id,
                    paymentStatus: 'COMPLETED',
                    itemType: 'פתיחת מודעה בודדת',
                    jobId: jobId
                });

                setSuccess(true);
            } else if (type === 'subscription' && user) {
                await addUserSubscription(user.id, 'monthly', details);

                // Log Transaction
                await paymentService.logTransaction({
                    userId: user.id,
                    userEmail: user.email || '',
                    amount: currentAmount,
                    currency: 'ILS',
                    paypalOrderId: details.id,
                    paymentStatus: 'COMPLETED',
                    itemType: 'מנוי חודשי'
                });

                setSuccess(true);
            }

        } catch (err) {
            console.error("Payment Processing Error:", err);
            setError("אירעה שגיאה בעיבוד התשלום. נא לנסות שוב או לפנות לתמיכה.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center font-assistant">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full animate-fade-in-up border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>

                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {type === 'post_job' ? 'המשרה פורסמה בהצלחה!' : 'התשלום התקבל בהצלחה!'}
                    </h1>
                    <p className="text-gray-600 mb-8">
                        {type === 'post_job' && 'שיהיה המון בהצלחה במציאת העובד המושלם.'}
                        {type === 'view_contact' && 'פרטי הקשר פתוחים כעת עבורך במשרה.'}
                        {type === 'subscription' && 'מנוי PRO הופעל בחשבונך. תהנה מגישה חופשית!'}
                    </p>

                    <div className="space-y-3">
                        {type === 'post_job' && (
                            <>
                                <Button onClick={() => setCurrentPage('home')} variant="primary" className="w-full justify-center bg-royal-blue hover:bg-blue-700">
                                    חזרה לדף המשרות
                                </Button>
                            </>
                        )}
                        {type === 'view_contact' && jobId && (
                            <Button onClick={() => setCurrentPage('jobDetails', { jobId })} variant="primary" className="w-full justify-center bg-deep-pink hover:bg-pink-600">
                                צפה בפרטי המשרה
                            </Button>
                        )}
                        {type === 'subscription' && (
                            <Button onClick={() => setCurrentPage('home')} variant="primary" className="w-full justify-center bg-royal-blue hover:bg-blue-700">
                                התחל לחפש עבודות
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-assistant">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="mb-6 border-none text-gray-500 hover:text-gray-900 !p-0 gap-2 hover:bg-transparent"
                >
                    <ArrowRightIcon className="w-5 h-5 rtl:scale-x-[-1]" />
                    חזרה
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* Right Column: Marketing Copy */}
                    <div className="space-y-8 animate-fade-in-right delay-100">
                        <div className={`bg-gradient-to-br ${marketingContent.gradientFrom} ${marketingContent.gradientTo} rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden transform hover:scale-[1.01] transition-transform duration-500`}>
                            {/* Decorative Circles with Pulse */}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white/10 blur-2xl animate-pulse delay-700"></div>

                            <div className="relative z-10">
                                <div className="bg-white/20 w-fit p-3 rounded-2xl mb-6 backdrop-blur-sm shadow-lg animate-bounce-slow">
                                    {marketingContent.icon}
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight drop-shadow-sm">
                                    {marketingContent.title}
                                </h1>
                                <p className="text-lg text-blue-50 leading-relaxed mb-8 font-medium">
                                    {marketingContent.subtitle}
                                </p>
                                <ul className="space-y-4">
                                    {marketingContent.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-3 group">
                                            <div className="bg-white/20 rounded-full p-1 group-hover:bg-white group-hover:text-royal-blue transition-colors duration-300">
                                                <CheckCircleIcon className="w-5 h-5 text-white group-hover:text-royal-blue transition-colors duration-300" />
                                            </div>
                                            <span className="font-medium group-hover:translate-x-1 transition-transform duration-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-gray-500 text-sm justify-center lg:justify-start opacity-75 hover:opacity-100 transition-opacity">
                            <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                            <span className="font-medium">האתר מאובטח ברמה הגבוהה ביותר (SSL Encrypted) - התשלום מאובטח ב-100%</span>
                        </div>
                    </div>

                    {/* Left Column: Checkout */}
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-100 animate-fade-in-left">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">סיכום הזמנה</h2>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">סה"כ לתשלום</p>
                                <p className="text-3xl font-extrabold text-royal-blue">₪{currentAmount}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 mb-8 flex items-start gap-3">
                            <CreditCardIcon className="w-6 h-6 text-royal-blue mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">תשלום מאובטח באמצעות PayPal</h3>
                                <p className="text-xs text-gray-600 mt-1">
                                    ניתן לשלם באמצעות חשבון PayPal או בכרטיס אשראי ישירות (גם ללא חשבון).
                                    <br />
                                    המערכת תומכת בכל סוגי הכרטיסים.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        {/* Developer Warnings */}
                        {window.location.protocol === 'http:' && mode === 'sandbox' && (
                            <div className="bg-yellow-50 p-4 rounded-xl mb-4 text-xs text-yellow-800 border border-yellow-200">
                                <span className="font-bold block mb-1">⚠️ שים לב (סביבת פיתוח):</span>
                                הדפדפן מציג אזהרת "Not Secure" מכיוון שהאתר רץ על שרת מקומי (Localhost) ללא הצפנת SSL.
                                <br />
                                <strong>בייצור (Production HTTPS) אזהרה זו לא תופיע, והמילוי האוטומטי יעבוד כרגיל.</strong>
                            </div>
                        )}
                        {/* PayPal container */}
                        <div className="min-h-[150px] relative z-0">
                            {!isReady ? (
                                paypalError ? (
                                    <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm text-center">
                                        <p className="font-bold mb-2">⚠️ שגיאה בטעינת PayPal</p>
                                        <p>{paypalError}</p>
                                        <p className="mt-2 text-xs text-red-500">בדוק את הקונסול למידע נוסף</p>
                                    </div>
                                ) : (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-blue"></div>
                                    </div>
                                )
                            ) : (
                                <>
                                    {mode === 'sandbox' && (
                                        <div className="bg-blue-50 p-2 rounded-lg mb-4 text-xs text-center text-blue-800 border border-blue-100 flex items-center justify-center gap-2">
                                            <span>מצב Sandbox (בדיקה)</span>
                                            <span className="block text-[10px] opacity-70">יש להשתמש בחשבונות בדיקה בלבד ולא בחשבון אמיתי.</span>
                                        </div>
                                    )}
                                    <PayPalButtons
                                        style={{ layout: "vertical", shape: "rect", height: 55, label: 'pay' }}
                                        disabled={isProcessing}
                                        forceReRender={[currentAmount, type]} // Re-render if amount changes
                                        createOrder={(data, actions) => {
                                            setError(null);
                                            return actions.order.create({
                                                purchase_units: [{
                                                    description: type === 'post_job' ? `פרסום משרה: ${jobTitle}` : (type === 'view_contact' ? `פתיחת קשר: ${jobTitle}` : 'מנוי חודשי'),
                                                    amount: {
                                                        value: currentAmount.toString(),
                                                        currency_code: "ILS" // Israeli Shekels
                                                    },
                                                    custom_id: `${type}_${jobId || 'sub'}`
                                                }],
                                                intent: "CAPTURE"
                                                // Removed NO_SHIPPING to allow address input
                                            });
                                        }}
                                        onApprove={handleApprove}
                                        onError={(err) => {
                                            console.error("PayPal Error:", err);
                                            setError("אירעה שגיאה בטעינת רכיב התשלום. נסה לרענן את הדף.");
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-xs text-gray-400">
                                בלחיצה על תשלום אני מאשר את <button onClick={() => setCurrentPage('terms')} className="underline hover:text-gray-600">תנאי השימוש</button> ואת <button onClick={() => setCurrentPage('privacy')} className="underline hover:text-gray-600">מדיניות הפרטיות</button>.
                            </p>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};
