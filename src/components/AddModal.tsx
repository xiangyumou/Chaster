'use client';

import { useState, useRef, useMemo } from 'react';

interface AddModalProps {
    isOpen: boolean;
    defaultDuration: number;
    onClose: () => void;
    onSubmit: (data: FormData) => Promise<void>;
}

// Duration presets in minutes
const DURATION_PRESETS = [
    { label: '1m', minutes: 1 },
    { label: '1h', minutes: 60 },
    { label: '6h', minutes: 360 },
    { label: '12h', minutes: 720 },
    { label: '1d', minutes: 1440 },
];

type TimeMode = 'duration' | 'absolute';

export default function AddModal({ isOpen, defaultDuration, onClose, onSubmit }: AddModalProps) {
    const [type, setType] = useState<'text' | 'image'>('text');
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [timeMode, setTimeMode] = useState<TimeMode>('duration');
    // Total accumulated duration in minutes (starts at 0, user adds to it)
    const [accumulatedDuration, setAccumulatedDuration] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Absolute time state - initialize with current time + 1 hour
    const getDefaultAbsoluteTime = () => {
        const d = new Date(Date.now() + 60 * 60 * 1000);
        return {
            year: d.getFullYear().toString().slice(-2),
            month: (d.getMonth() + 1).toString().padStart(2, '0'),
            day: d.getDate().toString().padStart(2, '0'),
            hour: d.getHours().toString().padStart(2, '0'),
            minute: d.getMinutes().toString().padStart(2, '0'),
        };
    };

    const [absoluteTime, setAbsoluteTime] = useState(getDefaultAbsoluteTime);

    // Calculate duration in minutes based on current mode
    const calculatedDuration = useMemo(() => {
        if (timeMode === 'duration') {
            return Math.max(1, accumulatedDuration); // At least 1 minute
        } else {
            // Absolute mode - calculate duration from now to target time
            const year = parseInt(absoluteTime.year) + 2000;
            const month = parseInt(absoluteTime.month) - 1;
            const day = parseInt(absoluteTime.day);
            const hour = parseInt(absoluteTime.hour);
            const minute = parseInt(absoluteTime.minute);

            const targetDate = new Date(year, month, day, hour, minute);
            const now = new Date();
            const diffMs = targetDate.getTime() - now.getTime();
            // Allow negative values to indicate invalid time
            return Math.ceil(diffMs / 60000);
        }
    }, [timeMode, accumulatedDuration, absoluteTime]);

    // Calculate and format the unlock time
    const unlockTimeInfo = useMemo(() => {
        const now = new Date();
        let unlockDate: Date;

        if (timeMode === 'absolute') {
            const year = parseInt(absoluteTime.year) + 2000;
            const month = parseInt(absoluteTime.month) - 1;
            const day = parseInt(absoluteTime.day);
            const hour = parseInt(absoluteTime.hour);
            const minute = parseInt(absoluteTime.minute);
            unlockDate = new Date(year, month, day, hour, minute);
        } else {
            unlockDate = new Date(now.getTime() + calculatedDuration * 60 * 1000);
        }

        // Format as "MM月dd日 HH:mm"
        const month = (unlockDate.getMonth() + 1).toString().padStart(2, '0');
        const day = unlockDate.getDate().toString().padStart(2, '0');
        const hour = unlockDate.getHours().toString().padStart(2, '0');
        const minute = unlockDate.getMinutes().toString().padStart(2, '0');

        // Calculate remaining time
        // validation: must be at least 1 minute in future
        const diffMs = unlockDate.getTime() - now.getTime();
        const totalMinutes = Math.ceil(diffMs / 60000);
        const isValid = totalMinutes >= 1;

        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const mins = totalMinutes % 60;

        let remaining = '';
        if (days > 0) remaining += `${days}d `;
        if (hours > 0) remaining += `${hours}h `;
        remaining += `${mins}m`;

        if (!isValid) {
            remaining = 'Time must be in the future';
        }

        return {
            formatted: `${month}月${day}日 ${hour}:${minute}`,
            remaining: remaining.trim(),
            isValid: isValid,
            unlockDate: unlockDate // Pass the date object for submission
        };
    }, [calculatedDuration, timeMode, absoluteTime]);

    if (!isOpen) return null;

    // Add duration from preset button (accumulative)
    const handlePresetClick = (minutes: number) => {
        setAccumulatedDuration(prev => prev + minutes);
    };

    // Set custom duration directly
    const handleCustomDurationChange = (value: string) => {
        const num = Math.max(0, parseInt(value) || 0);
        setAccumulatedDuration(num);
    };

    // Reset duration
    const handleResetDuration = () => {
        setAccumulatedDuration(0);
    };

    const handleAbsoluteTimeChange = (field: keyof typeof absoluteTime, value: string) => {
        setAbsoluteTime(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (type === 'text' && !text.trim()) return;
        if (type === 'image' && !file) return;
        if (!unlockTimeInfo.isValid) return;

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('type', type);

            if (timeMode === 'absolute') {
                // Send specific timestamp
                formData.append('decryptAt', unlockTimeInfo.unlockDate.getTime().toString());
            } else {
                // Send duration
                formData.append('durationMinutes', calculatedDuration.toString());
            }

            if (type === 'text') {
                formData.append('content', text);
            } else if (file) {
                formData.append('file', file);
            }

            await onSubmit(formData);

            // Reset form
            setText('');
            setFile(null);
            setAccumulatedDuration(0);
            setTimeMode('duration');
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Item</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`toggle-btn ${type === 'text' ? 'active' : ''}`}
                            onClick={() => setType('text')}
                        >
                            📝 Text
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${type === 'image' ? 'active' : ''}`}
                            onClick={() => setType('image')}
                        >
                            🖼️ Image
                        </button>
                    </div>

                    {type === 'text' ? (
                        <textarea
                            className="text-input"
                            placeholder="Enter your secret text..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={6}
                        />
                    ) : (
                        <div className="file-input-wrapper">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="file-input-hidden"
                            />
                            <button
                                type="button"
                                className="file-select-button"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {file ? file.name : 'Select Image'}
                            </button>
                        </div>
                    )}

                    {/* Time Mode Tabs */}
                    <div className="time-mode-section">
                        <div className="time-mode-tabs">
                            <button
                                type="button"
                                className={`time-mode-tab ${timeMode === 'duration' ? 'active' : ''}`}
                                onClick={() => setTimeMode('duration')}
                            >
                                ⏱️ Duration
                            </button>
                            <button
                                type="button"
                                className={`time-mode-tab ${timeMode === 'absolute' ? 'active' : ''}`}
                                onClick={() => setTimeMode('absolute')}
                            >
                                📅 Absolute Time
                            </button>
                        </div>

                        {timeMode === 'duration' ? (
                            <div className="duration-mode">
                                <div className="duration-presets-header">
                                    <span className="duration-hint">Click to add time:</span>
                                    {accumulatedDuration > 0 && (
                                        <button
                                            type="button"
                                            className="reset-btn"
                                            onClick={handleResetDuration}
                                        >
                                            ↺ Reset
                                        </button>
                                    )}
                                </div>
                                <div className="duration-presets-new">
                                    {DURATION_PRESETS.map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            className="preset-btn"
                                            onClick={() => handlePresetClick(preset.minutes)}
                                        >
                                            +{preset.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="custom-duration">
                                    <label>Or set exact duration (minutes):</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={accumulatedDuration || ''}
                                        placeholder="Enter minutes..."
                                        onChange={(e) => handleCustomDurationChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="absolute-mode">
                                <div className="absolute-time-inputs">
                                    <div className="time-input-group">
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="YY"
                                            value={absoluteTime.year}
                                            onChange={(e) => handleAbsoluteTimeChange('year', e.target.value.replace(/\D/g, ''))}
                                        />
                                        <span className="time-separator">-</span>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="MM"
                                            value={absoluteTime.month}
                                            onChange={(e) => handleAbsoluteTimeChange('month', e.target.value.replace(/\D/g, ''))}
                                        />
                                        <span className="time-separator">-</span>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="DD"
                                            value={absoluteTime.day}
                                            onChange={(e) => handleAbsoluteTimeChange('day', e.target.value.replace(/\D/g, ''))}
                                        />
                                        <span className="time-separator" style={{ margin: '0 8px' }}>@</span>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="HH"
                                            value={absoluteTime.hour}
                                            onChange={(e) => handleAbsoluteTimeChange('hour', e.target.value.replace(/\D/g, ''))}
                                        />
                                        <span className="time-separator">:</span>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="MM"
                                            value={absoluteTime.minute}
                                            onChange={(e) => handleAbsoluteTimeChange('minute', e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                </div>
                                {calculatedDuration < 1 && (
                                    <div className="time-error">⚠️ Please select a future time</div>
                                )}
                            </div>
                        )}

                        {/* Unlock Time Preview */}
                        <div className="unlock-preview">
                            <div className="unlock-preview-label">Unlock at:</div>
                            <div className="unlock-preview-time">{unlockTimeInfo.formatted}</div>
                            <div className="unlock-preview-remaining">({unlockTimeInfo.remaining} from now)</div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="submit-button"
                        disabled={isSubmitting || (type === 'text' ? !text.trim() : !file) || !unlockTimeInfo.isValid}
                    >
                        {isSubmitting ? 'Encrypting...' : 'Encrypt & Save'}
                    </button>
                </form>
            </div>
        </div>
    );
}
