import React from 'react';

export default function NewTaskButton({ onOpen = () => {} }) {
    return (
        <button
            onClick={onOpen}
            type="button"
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none"
        >
            New Task
        </button>
    );
}
