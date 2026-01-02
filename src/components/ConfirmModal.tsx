import React from 'react';
import { Modal } from './Modal';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from './icons';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'success' | 'info';
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'אישור',
    cancelText = 'ביטול',
    type = 'info',
    isLoading = false,
}) => {

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />;
            case 'success':
                return <CheckCircleIcon className="w-10 h-10 text-green-500" />;
            case 'info':
            default:
                return <InformationCircleIcon className="w-10 h-10 text-royal-blue" />;
        }
    };

    const getConfirmButtonClass = () => {
        const base = "px-4 py-2 rounded-md text-white font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
        switch (type) {
            case 'danger':
                return `${base} bg-red-600 hover:bg-red-700 focus:ring-red-500`;
            case 'success':
                return `${base} bg-green-600 hover:bg-green-700 focus:ring-green-500`;
            case 'info':
            default:
                return `${base} bg-royal-blue hover:bg-blue-700 focus:ring-blue-500`;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="text-center p-4">
                <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-red-100' : type === 'success' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {getIcon()}
                    </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue transition-colors"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={getConfirmButtonClass()}
                        disabled={isLoading}
                    >
                        {isLoading ? 'מעבד...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
