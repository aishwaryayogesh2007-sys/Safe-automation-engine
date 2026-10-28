import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Info, X, Loader2 } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
  requireReason = false,
  reasonPlaceholder = 'Please enter a reason or justification...',
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is required to proceed.');
      return;
    }
    setError('');
    onConfirm(reason);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-brand-red" />,
          btn: 'btn-danger',
          border: 'border-red-900/50',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-brand-amber" />,
          btn: 'px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2',
          border: 'border-amber-900/50',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-brand-green" />,
          btn: 'btn-success',
          border: 'border-emerald-900/50',
        };
      default:
        return {
          icon: <Info className="w-6 h-6 text-brand-blue" />,
          btn: 'btn-primary',
          border: 'border-blue-900/50',
        };
    }
  };

  const currentVariant = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md bg-dark-800 border ${currentVariant.border} rounded-xl shadow-2xl p-6`}>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-dark-700/60 shrink-0">
            {currentVariant.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {requireReason && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Reason / Justification <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              className="input text-sm"
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setError('');
              }}
            />
            {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={currentVariant.btn}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
