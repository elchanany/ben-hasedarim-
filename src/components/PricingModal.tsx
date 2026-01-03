import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { CheckCircleIcon, XCircleIcon, StarIcon, SparklesIcon } from './icons';
import { Button } from './Button';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPlan: (plan: 'single' | 'monthly') => void;
    singlePrice: number;
    subscriptionPrice: number;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectPlan, singlePrice, subscriptionPrice }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-right align-middle shadow-2xl transition-all border border-gray-100">

                                <div className="text-center mb-8">
                                    <Dialog.Title as="h3" className="text-3xl font-bold text-royal-blue mb-2">
                                        גישה לפרטי יצירת קשר
                                    </Dialog.Title>
                                    <p className="text-gray-500">בחר את המסלול המתאים לך ביותר</p>
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Single Job Plan */}
                                    <div className="relative border-2 border-gray-100 rounded-xl p-6 hover:border-royal-blue/50 transition-all duration-300 hover:shadow-lg flex flex-col items-center text-center group">
                                        <div className="bg-gray-50 rounded-full p-4 mb-4 group-hover:bg-blue-50 transition-colors">
                                            <StarIcon className="w-8 h-8 text-royal-blue" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-800 mb-2">משרה בודדת</h4>
                                        <p className="text-gray-500 text-sm mb-6 min-h-[40px]">פתח את פרטי הקשר למשרה ספציפית זו בלבד.</p>
                                        <div className="text-4xl font-extrabold text-royal-blue mb-6">
                                            ₪{singlePrice} <span className="text-sm font-normal text-gray-400">/ חד פעמי</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-center py-3 border-royal-blue text-royal-blue hover:bg-royal-blue hover:text-white"
                                            onClick={() => onSelectPlan('single')}
                                        >
                                            בחר מסלול בודד
                                        </Button>
                                    </div>

                                    {/* Monthly Subscription Plan */}
                                    <div className="relative border-2 border-deep-pink rounded-xl p-6 bg-gradient-to-b from-white to-pink-50 shadow-md transform scale-105 z-10 flex flex-col items-center text-center">
                                        <div className="absolute top-0 right-0 bg-deep-pink text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                                            מומלץ ביותר
                                        </div>
                                        <div className="bg-pink-100 rounded-full p-4 mb-4 animate-pulse">
                                            <SparklesIcon className="w-8 h-8 text-deep-pink" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-800 mb-2">חופשי-חודשי</h4>
                                        <p className="text-gray-500 text-sm mb-6 min-h-[40px]">גישה מלאה לכל המשרות באתר למשך 30 יום!</p>
                                        <div className="text-4xl font-extrabold text-deep-pink mb-6">
                                            ₪{subscriptionPrice} <span className="text-sm font-normal text-gray-400">/ לחודש</span>
                                        </div>
                                        <Button
                                            variant="primary"
                                            className="w-full justify-center py-3 text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all bg-deep-pink hover:bg-pink-600 border-none"
                                            onClick={() => onSelectPlan('monthly')}
                                        >
                                            בחר מנוי חודשי
                                        </Button>
                                        <p className="text-xs text-gray-400 mt-3">משתלם כבר מהמשרה השלישית!</p>
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
