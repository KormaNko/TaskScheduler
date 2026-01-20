import React from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

export default function NewTaskButton({ onOpen = () => {} }) {
    const { t } = useOptions();
    return (
        <button
            onClick={onOpen}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-500 shadow-sm hover:from-indigo-600 hover:to-blue-600 focus:outline-none"
        >
            <span className="inline-block w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">+</span>
            <span>{t ? t('newTask') : 'New task'}</span>
        </button>
    );
}
