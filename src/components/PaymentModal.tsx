import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react'; // React is already imported
import { PayPalButtons } from "@paypal/react-paypal-js";
import { CheckCircleIcon, XCircleIcon, LockClosedIcon, CreditCardIcon } from './icons';
import { Button } from './Button';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: (details: any) => void;
    amount: number;
    title: string;
    description: string;
    paymentType: 'post_job' | 'view_contact' | 'subscription';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onPaymentSuccess,
    amount,
    title,
    description,
    paymentType
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => { if (!isProcessing) onClose(); }}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-0 text-right align-middle shadow-2xl transition-all border border-gray-100">

                                {/* Header */}
                                <div className="bg-gradient-to-r from-royal-blue to-deep-pink p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10 blur-xl"></div>

                                    <Dialog.Title as="h3" className="text-2xl font-bold flex items-center gap-2 relative z-10">
                                        <CreditCardIcon className="w-8 h-8" />
                                        {title}
                                    </Dialog.Title>
                                    <p className="mt-2 text-blue-100 relative z-10">{description}</p>

                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 left-4 text-white/70 hover:text-white transition-colors"
                                        disabled={isProcessing}
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    {/* Price Display */}
                                    <div className="text-center mb-8">
                                        <p className="text-gray-500 text-sm font-medium mb-1">סה"כ לתשלום</p>
                                        <div className="text-5xl font-extrabold text-royal-blue tracking-tight">
                                            ₪{amount}
                                        </div>
                                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-green-600 bg-green-50 py-1 px-3 rounded-full w-fit mx-auto">
                                            <LockClosedIcon className="w-3 h-3" />
                                            <span>תשלום מאובטח ומוצפן</span>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-start gap-2">
                                            <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {/* PayPal Buttons */}
                                    <div className="relative z-0">
                                        <PayPalButtons
                                            style={{ layout: "vertical", shape: "rect", label: "pay", height: 48 }}
                                            disabled={isProcessing}
                                            createOrder={(data, actions) => {
                                                setIsProcessing(true);
                                                setError(null);
                                                return actions.order.create({
                                                    purchase_units: [
                                                        {
                                                            description: description,
                                                            amount: {
                                                                value: amount.toString(),
                                                                currency_code: "ILS"
                                                            },
                                                            custom_id: paymentType
                                                        },
                                                    ],
                                                    intent: "CAPTURE"
                                                });
                                            }}
                                            onApprove={async (data, actions) => {
                                                try {
                                                    const details = await actions.order!.capture();
                                                    setIsProcessing(false);
                                                    onPaymentSuccess(details);
                                                } catch (err) {
                                                    console.error("Payment Capture Error:", err);
                                                    setIsProcessing(false);
                                                    setError("אירעה שגיאה בחיוב התשלום. אנא נסה שנית או פנה לתמיכה.");
                                                }
                                            }}
                                            onError={(err) => {
                                                console.error("PayPal Button Error:", err);
                                                setIsProcessing(false);
                                                setError("שגיאה בטעינת מערכת התשלומים. אנא בדוק את החיבור לרשת.");
                                            }}
                                            onCancel={() => {
                                                setIsProcessing(false);
                                            }}
                                        />
                                    </div>

                                    <div className="mt-6 text-center text-xs text-gray-400">
                                        <p>בביצוע התשלום הינך מסכים לתנאי השימוש ומדיניות הפרטיות.</p>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
