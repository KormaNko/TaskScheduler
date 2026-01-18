import React from 'react';

export default function TaskCard({ task = {}, categories = [], onEdit = () => {}, onDelete = () => {} }) {
    const { id = '', title = '', description = '', status = '', priority = '', deadline = null, category = null, createdAt = null, updatedAt = null } = task;

    const fmt = (v) => {
        if (!v) return '-';
        const t = String(v).replace(' ', 'T');
        const d = new Date(t);
        return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
    };

    // resolve category: backend might store id, name, or an object; also try alternate fields on task
    const resolveCategory = (cat) => {
        // if direct value provided, use it (object or primitive)
        const pickNameFromObject = (obj) => { if (!obj) return null; return obj.name ?? null; };

        if (cat !== null && cat !== undefined && cat !== '') {
            // If category is a JSON string like '{"id":1,"name":"X"}', parse it to object
            if (typeof cat === 'string' && (cat.trim().startsWith('{') || cat.trim().startsWith('['))) {
                try { cat = JSON.parse(cat); } catch (e) { /* ignore parse error */ }
            }
            if (typeof cat === 'object') {
                const n = pickNameFromObject(cat);
                return n ?? String(cat);
            }
            // try to resolve by id or name from provided categories
            if (Array.isArray(categories) && categories.length > 0) {
                const foundById = categories.find(c => String(c.id) === String(cat));
                if (foundById) return foundById.name ?? String(cat);
                const foundByName = categories.find(c => (c.name ?? '').toLowerCase() === String(cat).toLowerCase());
                if (foundByName) return foundByName.name;
            }
            return String(cat);
        }

        // if no direct category, try common alternate fields on task object
        const altCandidates = [task?.category_id, task?.cat, task?.cat_id, task?.category];
        for (const alt of altCandidates) {
            if (alt === null || alt === undefined || alt === '') continue;
            if (typeof alt === 'object') {
                const n = pickNameFromObject(alt);
                if (n) return n;
            } else {
                if (Array.isArray(categories) && categories.length > 0) {
                    const found = categories.find(c => String(c.id) === String(alt));
                    if (found) return found.name;
                    const foundByName = categories.find(c => (c.name ?? '').toLowerCase() === String(alt).toLowerCase());
                    if (foundByName) return foundByName.name;
                }
                return String(alt);
            }
        }

        return '-';
    };

    return (
        <tr className="border-t">
            <td className="p-3">{id}</td>
            <td className="p-3 min-w-[220px]">
                <div className="font-semibold">{title || '-'}</div>
                {description ? <div className="text-sm text-gray-600">{description}</div> : null}
            </td>
            <td className="p-3">{status || '-'}</td>
            <td className="p-3 text-center">{priority ?? '-'}</td>
            <td className="p-3">{resolveCategory(category)}</td>
            <td className="p-3">{fmt(deadline)}</td>
            <td className="p-3 text-sm text-gray-600">{fmt(createdAt)}</td>
            <td className="p-3 text-sm text-gray-600">{fmt(updatedAt)}</td>
            <td className="p-3 whitespace-nowrap">
                <button onClick={() => onEdit(task)} className="mr-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                <button onClick={() => onDelete(id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </td>
        </tr>
    );
}
