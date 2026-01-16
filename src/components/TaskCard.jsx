import React from 'react';

export default function TaskCard({ task = {}, onEdit = () => {}, onDelete = () => {} }) {
    const { id = '', title = '', description = '', status = '', priority = '', deadline = null, category = null, createdAt = null, updatedAt = null } = task;

    const fmt = (v) => {
        if (!v) return '-';
        const t = String(v).replace(' ', 'T');
        const d = new Date(t);
        return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
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
            <td className="p-3">{category ?? '-'}</td>
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
