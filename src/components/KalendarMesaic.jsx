// Import React knižnice a hooku useState na prácu so stavom komponentu
import React, { useState } from "react";

// Komponent mesačného kalendára - mobile-first a responzívny
// Props: rows (default 6), cols (default 7), month (1-12), year
export default function KalendarMesiac({ rows = 6, cols = 7, month, year }) {

    // Názvy mesiacov v slovenčine
    const months = [
        'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
        'Júl', 'August', 'September', 'Október', 'November', 'December'
    ];

    // Skratky dní v týždni (pondelok..nedeľa)
    const daysOfWeek = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

    // Aktuálny mesiac/rok (so zodpovedajúcimi defaultami)
    const [currentMonth, setCurrentMonth] = useState(month ?? new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(year ?? new Date().getFullYear());

    // Zmena mesiaca o delta (-1 alebo +1)
    function changeMonth(delta) {
        let m = currentMonth + delta;
        let y = currentYear;
        if (m < 1) { m = 12; y -= 1; }
        if (m > 12) { m = 1; y += 1; }
        setCurrentMonth(m);
        setCurrentYear(y);
    }

    // Výpočty potrebné pre vykreslenie dní
    const monthIndex = Math.max(0, Math.min(11, currentMonth - 1));
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const firstJsDay = new Date(currentYear, monthIndex, 1).getDay();
    const firstDayMondayIndex = (firstJsDay + 6) % 7;
    const leading = Array.from({ length: firstDayMondayIndex }, () => null);
    const dateCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalNeeded = leading.length + dateCells.length;
    const baseGridCells = rows * cols;
    const totalGridCells = Math.max(baseGridCells, Math.ceil(totalNeeded / cols) * cols);
    const displayCells = [...leading, ...dateCells];
    while (displayCells.length < totalGridCells) displayCells.push(null);

    // ------------------
    // ŠTÝLY (samostatné objekty)
    // ------------------

    // Hlavný kontajner
    const containerStyle = {
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '12px',
        boxSizing: 'border-box',
    };

    // Horný ovládací panel
    const controlBarStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
    };

    // Skupina tlačidiel
    const controlGroupStyle = {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    };

    // Tlačidlo (jednoduché)
    const buttonStyle = {
        padding: '8px 10px',
        borderRadius: '6px',
        background: '#f3f4f6',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        fontSize: '14px',
    };

    // Nadpis mesiaca
    const titleStyle = {
        textAlign: 'center',
        fontWeight: 600,
        flex: 1,
    };

    // Wrapper pre grid
    const gridWrapperStyle = {
        overflow: 'hidden',
        borderRadius: '8px',
        maxWidth: '100%',
    };

    // Dynamická šablóna stĺpcov (gridTemplateColumns) + obecné vlastnosti gridu
    const gridStyle = {
        display: 'grid',
        gap: '6px',
        padding: '6px',
        background: 'transparent',
        ...{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
    };

    // Štýl hlavičky dní
    const headerStyle = {
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        color: '#111827',
    };

    // Štýl jednej bunky (deň)
    const cellStyle = {
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        minHeight: '48px',
        boxSizing: 'border-box',
        fontSize: '14px',
        color: '#111827',
    };

    const dateNumberStyle = {
        fontSize: '12px',
        fontWeight: 500,
        color: '#374151',
    };

    const eventsStyle = {
        marginTop: '6px',
        fontSize: '12px',
        color: '#6b7280',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    // Dynamický inline style pre jednotlivú bunku, aby sme vedeli odlíšiť prázdne
    function cellCombinedStyle(isEmpty) {
        return {
            ...cellStyle,
            background: isEmpty ? 'transparent' : cellStyle.background,
        };
    }

    // ------------------
    // Render
    // ------------------
    return (
        <div style={containerStyle}>

            {/* Horný ovládací panel kalendára */}
            <div style={controlBarStyle}>
                <div style={controlGroupStyle}>
                    <button
                        onClick={() => changeMonth(-1)}
                        aria-label="Predchádzajúci mesiac"
                        style={buttonStyle}
                    >
                        Prev
                    </button>

                    <button
                        onClick={() => { setCurrentMonth(new Date().getMonth() + 1); setCurrentYear(new Date().getFullYear()); }}
                        aria-label="Dnešný mesiac"
                        style={{ ...buttonStyle, background: '#ffffff' }}
                    >
                        Dnes
                    </button>
                </div>

                <div style={titleStyle}>
                    <div style={{ fontWeight: 700 }}>{months[currentMonth - 1]} {currentYear}</div>
                </div>

                <div style={controlGroupStyle}>
                    <button
                        onClick={() => changeMonth(1)}
                        aria-label="Nasledujúci mesiac"
                        style={buttonStyle}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Grid s dňami */}
            <div style={gridWrapperStyle}>
                <div style={gridStyle}>

                    {/* Hlavička dní */}
                    {daysOfWeek.slice(0, cols).map((d, i) => (
                        <div key={`header-${i}`} style={headerStyle}>
                            {d}
                        </div>
                    ))}

                    {/* Dni mesiaca */}
                    {displayCells.map((v, i) => (
                        <div key={i} style={cellCombinedStyle(v === null)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={dateNumberStyle}>{v !== null ? v : ''}</div>
                                {/* miesto pre ikony/indikátory */}
                            </div>

                            <div style={eventsStyle}>{/* sem sa dajú pridať eventy */}</div>
                        </div>
                    ))}

                </div>
            </div>

        </div>
    );
}
