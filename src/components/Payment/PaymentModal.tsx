
import React, { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { Modal } from '../Modal';
import { paymentService } from '../../services/paymentService';
import { useAuth } from '../../hooks/useAuth';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderId: string) => void;
    type: 'POST_JOB' | 'VIEW_SINGLE' | 'VIEW_SUBSCRIPTION';
    jobId?: string;
    amount: string; // Display amount
    title: string;
    description: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    type,
    jobId,
    amount,
    title,
    description
}) => {
    const { user } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleCreateOrder = async () => {
        try {
            setError(null);
            // Call backend to create order
            const orderId = await paymentService.createOrder(type, jobId);
            return orderId;
        } catch (err: any) {
            console.error("Create Order Error:", err);
            setError("שגיאה ביצירת הזמנה. אנא נסה שוב.");
            // We must return a string or throws, PayPal handles reject.
            throw err;
        }
    };

    const handleApprove = async (data: any, actions: any) => {
        try {
            setLoading(true);
            // Capture the order via backend
            const result = await paymentService.captureOrder(data.orderID, type, jobId);

            if (result.success) {
                onSuccess(data.orderID);
                onClose();
            } else {
                setError("התשלום לא הושלם בהצלחה.");
            }
        } catch (err: any) {
            console.error("Capture Error:", err);
            setError("אירעה שגיאה באישור התשלום. אנא פנה לתמיכה אם חוייבת.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="תשלום מאובטח">
            <div className="space-y-6 p-4">
                <div className="text-center">
                    <h3 className="text-xl font-bold text-royal-blue mb-2">{title}</h3>
                    <p className="text-gray-600 mb-4">{description}</p>
                    <div className="text-3xl font-bold text-deep-pink mb-6">₪{amount}</div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="text-center text-blue-600 mb-4 animate-pulse">
                        מעבד תשלום...
                    </div>
                )}

                <div className="relative z-0">
                    <PayPalButtons
                        style={{ layout: "vertical", shape: "rect", label: "pay" }}
                        createOrder={handleCreateOrder}
                        onApprove={handleApprove}
                        onError={(err) => {
                            console.error("PayPal Error:", err);
                            setError("אירעה שגיאה בתקשורת עם PayPal.");
                        }}
                    />
                </div>

                <p className="text-xs text-center text-gray-400 mt-4">
                    התשלום מאובטח באמצעות PayPal. פרטי האשראי אינם נשמרים אצלנו.
                </p>
            </div>
        </Modal>
    );
};
