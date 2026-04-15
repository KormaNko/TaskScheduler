import React from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

export default function TaskCard({ task = {}, onEdit = () => {}, onDelete = () => {}, onChangeStatus = () => {}, actionLoading = false, viewMode = 'detailed', onOpenDetails = () => {}, isSelected = false, onToggleSelect = () => {} }) {
    const { t } = useOptions();
    const { id = '', title = '', description = '', status = '', priority = '', deadline = null, category = null, createdAt = null, updatedAt = null, timeToComplete = null, atomicTask = 0, isDynamic = 0 } = task;

    const fmt = (v) => {
        if (!v) return '-';
        const t = String(v).replace(' ', 'T');
        const d = new Date(t);
        return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
    };

    const formatTimeToComplete = (mins) => {
        if (mins === null || mins === undefined || mins === '') return null;
        const n = Number(mins);
        if (Number.isNaN(n) || n < 0) return null;
        if (n === 0) return '0 min';
        if (n < 60) return `${n} min`;
        const h = Math.floor(n / 60);
        const m = n % 60;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    const resolveCategoryMeta = (cat) => ({ name: cat?.name ?? null, color: cat?.color ?? null });

    const textColorForBg = (hex) => {
        if (!hex) return '#111827';
        try {
            const h = hex.replace('#', '');
            const r = parseInt(h.substring(0, 2), 16) / 255;
            const g = parseInt(h.substring(2, 4), 16) / 255;
            const b = parseInt(h.substring(4, 6), 16) / 255;
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            return lum > 0.6 ? '#111827' : '#ffffff';
        } catch (e) { return '#ffffff'; }
    };

    const categoryMeta = resolveCategoryMeta(category);

    const isHighPriority = (() => { try { return Number(priority) >= 5; } catch (e) { return false; } })();

    const rowBgClass = (() => {
        if (String(status) === 'completed') return 'bg-green-50';
        if (String(status) === 'in_progress') return 'bg-yellow-50';
        if (isHighPriority) return 'bg-red-50';
        return '';
    })();

    const renderStatusPill = (st) => {
        if (!st) return null;
        const s = String(st);
        const label = s === 'completed' ? (t ? t('completed') : 'Completed') : s === 'in_progress' ? (t ? t('in_progress') : 'In progress') : s === 'pending' ? (t ? t('pending') : 'Pending') : s;
        const base = 'inline-block text-xs px-2 py-0.5 rounded-full font-medium';
        if (s === 'completed') return <span className={base + ' bg-green-100 text-green-800 ml-2'}>{label}</span>;
        if (s === 'in_progress') return <span className={base + ' bg-yellow-100 text-yellow-800 ml-2'}>{label}</span>;
        return <span className={base + ' bg-gray-100 text-gray-700 ml-2'}>{label}</span>;
    };

    if (viewMode === 'simple') {
        return (
            <tr onClick={() => onOpenDetails(task)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onOpenDetails(task); } }} className={"border-t " + rowBgClass + ' hover:bg-gray-50 cursor-pointer'}>
                <td colSpan={9} className="p-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            {/* selection checkbox (simple view) */}
                            <label className="inline-flex items-center gap-2 mr-2">
                                <input type="checkbox" checked={Boolean(isSelected)} onChange={(e) => { e.stopPropagation(); onToggleSelect(); }} onClick={(e) => e.stopPropagation()} className="rounded" />
                            </label>
                            <div className={"font-semibold " + (isHighPriority ? 'text-red-700' : '')}>{title || '-'}{renderStatusPill(status)}{Number(atomicTask) === 1 ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 ml-2">{t ? t('atomic') : 'Atomic'}</span> : null}{Number(isDynamic) === 1 ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 ml-2">{t ? t('dynamic') : 'Dynamic'}</span> : null}</div>
                            {description ? <div className="text-sm text-gray-600 whitespace-pre-wrap break-words break-all">{description}</div> : null}
                            {(() => {
                                const ft = formatTimeToComplete(timeToComplete);
                                return ft ? <div className="text-sm text-gray-500 mt-1">{t ? t('timeToComplete') : 'Time to complete'}: <span className="font-medium">{ft}</span></div> : null;
                            })()}
                        </div>
                        {categoryMeta?.name ? (
                            categoryMeta.color ? (
                                <span className="inline-block px-2 py-1 rounded-full text-xs ml-3 flex-shrink-0" style={{ background: categoryMeta.color, color: textColorForBg(categoryMeta.color) }}>{categoryMeta.name}</span>
                            ) : (
                                <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 ml-3 flex-shrink-0">{categoryMeta.name}</span>
                            )
                        ) : null}
                    </div>
                    {/* Note: per-row action buttons removed — actions live in the batch toolbar above the list */}
                </td>
            </tr>
        );
    }

    return (
        <tr onClick={() => onOpenDetails(task)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onOpenDetails(task); } }} className={"border-t " + rowBgClass + ' hover:bg-gray-50 cursor-pointer'}>
            {/* selection checkbox column */}
            <td className="p-3 text-center">
                <input type="checkbox" checked={Boolean(isSelected)} onChange={(e) => { e.stopPropagation(); onToggleSelect(); }} onClick={(e) => e.stopPropagation()} className="rounded" aria-label={`Select task ${id}`} />
            </td>
            <td className="p-3">{id}</td>
            <td className="p-3 min-w-0">
                <div className={"font-semibold " + (isHighPriority ? 'text-red-700' : '')}>{title || '-'}{renderStatusPill(status)}{Number(atomicTask) === 1 ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 ml-2">{t ? t('atomic') : 'Atomic'}</span> : null}{Number(isDynamic) === 1 ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 ml-2">{t ? t('dynamic') : 'Dynamic'}</span> : null}</div>
                {description ? (
                    <div className="text-sm text-gray-600">
                        <div className="whitespace-pre-wrap break-words">{description}</div>
                    </div>
                ) : null}
                {(() => {
                    const ft = formatTimeToComplete(timeToComplete);
                    return ft ? <div className="text-sm text-gray-500 mt-1">{t ? t('timeToComplete') : 'Time to complete'}: <span className="font-medium">{ft}</span></div> : null;
                })()}
            </td>
            <td className="p-3">{status || '-'}</td>
            <td className="p-3 text-center">{priority ?? '-'}</td>
            <td className="p-3">
                {(() => {
                    const meta = resolveCategoryMeta(category);
                    if (meta?.color) {
                        const tc = textColorForBg(meta.color);
                        return (
                            <span className="inline-block px-2 py-1 rounded-full text-xs" style={{ background: meta.color, color: tc }}>{meta.name}</span>
                        );
                    }
                    return meta?.name ? <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{meta.name}</span> : '-';
                })()}
            </td>
            <td className="p-3">{fmt(deadline)}</td>
            <td className="p-3 text-sm text-gray-600">{fmt(createdAt)}</td>
            <td className="p-3 text-sm text-gray-600">{fmt(updatedAt)}</td>
            <td className="p-3 text-sm text-gray-500">{t ? t('selectToAct') : 'Select tasks above to act'}</td>
        </tr>
    );
}
