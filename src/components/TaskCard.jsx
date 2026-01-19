import React from 'react';

export default function TaskCard({ task = {}, categories = [], onEdit = () => {}, onDelete = () => {}, onChangeStatus = () => {}, actionLoading = false, viewMode = 'detailed' }) {
    const { id = '', title = '', description = '', status = '', priority = '', deadline = null, category = null, createdAt = null, updatedAt = null } = task;

    const fmt = (v) => {
        if (!v) return '-';
        const t = String(v).replace(' ', 'T');
        const d = new Date(t);
        return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
    };

    // Return both name and color when possible
    const resolveCategoryMeta = (cat) => {
        const pickFromObject = (obj) => {
            if (!obj) return null;
            return { name: obj.name ?? null, color: obj.color ?? null, id: obj.id ?? null };
        };

        // Normalize JSON string
        if (typeof cat === 'string' && (cat.trim().startsWith('{') || cat.trim().startsWith('['))) {
            try { cat = JSON.parse(cat); } catch (e) { /* ignore */ }
        }

        if (cat !== null && cat !== undefined && cat !== '') {
            if (typeof cat === 'object') {
                const meta = pickFromObject(cat);
                return { name: meta?.name ?? String(cat), color: meta?.color ?? null };
            }

            if (Array.isArray(categories) && categories.length > 0) {
                const foundById = categories.find(c => String(c.id) === String(cat));
                if (foundById) return { name: foundById.name ?? String(cat), color: foundById.color ?? null };
                const foundByName = categories.find(c => (c.name ?? '').toLowerCase() === String(cat).toLowerCase());
                if (foundByName) return { name: foundByName.name, color: foundByName.color ?? null };
            }

            return { name: String(cat), color: null };
        }

        // try alternate fields on task
        const altCandidates = [task?.category, task?.category_id, task?.cat, task?.cat_id];
        for (const alt of altCandidates) {
            if (alt === null || alt === undefined || alt === '') continue;
            if (typeof alt === 'object') {
                const meta = pickFromObject(alt);
                if (meta?.name) return { name: meta.name, color: meta.color ?? null };
            } else {
                if (Array.isArray(categories) && categories.length > 0) {
                    const found = categories.find(c => String(c.id) === String(alt));
                    if (found) return { name: found.name, color: found.color ?? null };
                    const foundByName = categories.find(c => (c.name ?? '').toLowerCase() === String(alt).toLowerCase());
                    if (foundByName) return { name: foundByName.name, color: foundByName.color ?? null };
                }
                return { name: String(alt), color: null };
            }
        }

        return { name: '-', color: null };
    };

    const textColorForBg = (hex) => {
        if (!hex) return '#111827';
        try {
            const h = hex.replace('#','');
            const r = parseInt(h.substring(0,2),16)/255;
            const g = parseInt(h.substring(2,4),16)/255;
            const b = parseInt(h.substring(4,6),16)/255;
            const lum = 0.2126*r + 0.7152*g + 0.0722*b;
            return lum > 0.6 ? '#111827' : '#ffffff';
        } catch (e) { return '#ffffff'; }
    };

    // resolve category metadata once so both views can use it
    const categoryMeta = resolveCategoryMeta(category);

    // determine high priority
    const isHighPriority = (() => {
        try { return Number(priority) >= 5; } catch (e) { return false; }
    })();

    // compute row background class based on status (status has precedence for bg), fallback to high-priority
    const rowBgClass = (() => {
        if (String(status) === 'completed') return 'bg-green-50';
        if (String(status) === 'in_progress') return 'bg-yellow-50';
        if (isHighPriority) return 'bg-red-50';
        return '';
    })();

    // Simple view: single row with one cell spanning all columns showing only title + description
    if (viewMode === 'simple') {
        return (
            <tr className={"border-t " + rowBgClass}>
                 <td colSpan={9} className="p-3">
                     <div className="flex items-start justify-between gap-4">
                         <div className="min-w-0 flex-1">
-                            <div className={"font-semibold " + (isHighPriority ? 'text-red-700' : '')}>{title || '-'}</div>
+                            <div className={"font-semibold " + (isHighPriority ? 'text-red-700' : '')}>{title || '-'}</div>
                             {description ? <div className="text-sm text-gray-600 whitespace-pre-wrap break-words break-all">{description}</div> : null}
                         </div>
                         {categoryMeta?.name ? (
                            categoryMeta.color ? (
                                <span className="inline-block px-2 py-1 rounded-full text-xs ml-3 flex-shrink-0" style={{ background: categoryMeta.color, color: textColorForBg(categoryMeta.color) }}>{categoryMeta.name}</span>
                            ) : (
                                <span className="text-sm text-gray-600 ml-3 flex-shrink-0">{categoryMeta.name}</span>
                            )
                        ) : null}
                     </div>
                     {/* action buttons for simple view: Start (pending -> in_progress) and Complete */}
                     <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => onChangeStatus(id, 'in_progress')}
                            disabled={actionLoading || status === 'in_progress' || status === 'completed'}
                            className={"px-3 py-1 rounded text-sm " + (actionLoading ? 'opacity-50 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600')}
                        >
                            Start
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeStatus(id, 'completed')}
                            disabled={actionLoading || status === 'completed'}
                            className={"px-3 py-1 rounded text-sm " + (actionLoading ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700')}
                        >
                            Complete
                        </button>
                    </div>
                </td>
            </tr>
        );
    }

    // Detailed view (existing layout)
    return (
        <tr className={"border-t " + rowBgClass}>
              <td className="p-3">{id}</td>
              <td className="p-3 min-w-[220px]">
                <div className={"font-semibold " + (isHighPriority ? 'text-red-700' : '')}>{title || '-'}</div>
                 {description ? (
                     <div className="text-sm text-gray-600">
                         <div className="whitespace-pre-wrap break-words break-all max-w-[60ch]">{description}</div>
                     </div>
                 ) : null}
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
                    return meta?.name ?? '-';
                })()}
             </td>
             <td className="p-3">{fmt(deadline)}</td>
             <td className="p-3 text-sm text-gray-600">{fmt(createdAt)}</td>
             <td className="p-3 text-sm text-gray-600">{fmt(updatedAt)}</td>
             <td className="p-3 whitespace-nowrap">
                <button
                    onClick={() => onChangeStatus(id, 'in_progress')}
                    disabled={actionLoading || status === 'in_progress' || status === 'completed'}
                    className={"mr-2 px-3 py-1 rounded text-sm " + (actionLoading ? 'opacity-50 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600')}
                >Start</button>
                <button
                    onClick={() => onChangeStatus(id, 'completed')}
                    disabled={actionLoading || status === 'completed'}
                    className={"mr-2 px-3 py-1 rounded text-sm " + (actionLoading ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700')}
                >Complete</button>
                <button onClick={() => onEdit(task)} className="mr-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                <button onClick={() => onDelete(id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
             </td>
        </tr>
    );
}
