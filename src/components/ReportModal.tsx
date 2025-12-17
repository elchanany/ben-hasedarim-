import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void>;
    title?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit, title = 'דיווח על תוכן פוגעני' }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) return;
        setLoading(true);
        try {
            await onSubmit(reason);
            setReason('');
            onClose();
        } catch (error) {
            console.error("Error submitting report:", error);
            alert('שגיאה בשליחת הדיווח');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="p-4 space-y-4">
                <p className="text-gray-600">אנא פרט את סיבת הדיווח:</p>
                <textarea
                    className="w-full border rounded-md p-2 h-32 focus:ring-2 focus:ring-royal-blue focus:border-transparent outline-none resize-none"
                    placeholder="כתוב כאן..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                    <Button variant="outline" onClick={onClose} disabled={loading}>ביטול</Button>
                    <Button variant="danger" onClick={handleSubmit} isLoading={loading} disabled={!reason.trim()}>
                        שלח דיווח
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
