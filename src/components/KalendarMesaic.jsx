import React, { useState } from "react";


export default function KalendarMesiac({ rows, cols,month,year }) {

    const months = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];
    const daysOfWeek = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

    const [currentMonth, setCurrentMonth] = useState(month ?? new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(year ?? new Date().getFullYear());

    function changeMonth(delta) {
        let m = currentMonth + delta;
        let y = currentYear;
        if (m < 1) { m = 12; y -= 1; }
        if (m > 12) { m = 1; y += 1; }
        setCurrentMonth(m);
        setCurrentYear(y);
    }

    const monthIndex = Math.max(0, Math.min(11, (currentMonth) - 1));
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const firstJsDay = new Date(currentYear, monthIndex, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const firstDayMondayIndex = (firstJsDay + 6) % 7;

    const leading = Array.from({ length: firstDayMondayIndex }, () => null);
    const dateCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const totalNeeded = leading.length + dateCells.length;
    const baseGridCells = rows * cols;
    const totalGridCells = Math.max(baseGridCells, Math.ceil(totalNeeded / cols) * cols);

    const displayCells = [...leading, ...dateCells];
    while (displayCells.length < totalGridCells) displayCells.push(null);

    const gridStyle = {
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "1px",
        padding: "5px",
        maxWidth: "1100px",
        margin: "0 auto",
    };

    const cellStyle = {
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        display: "flex",
        alignItems: "left",
        justifyContent: "top",
        aspectRatio: "1 / 1",
        fontSize: "14px",
        color: "#111827",
    };

    const headerStyle = {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        height: "36px",
        color: "#111827",
    };

    return (
        <div className="min-h-screen">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1100px", margin: "0 auto 8px" }}>
                <button onClick={() => changeMonth(-1)}>Prev</button>
                <div style={{ fontWeight: 600 }}>{months[currentMonth - 1]} {currentYear}</div>
                <button onClick={() => changeMonth(1)}>Next</button>
            </div>

            <div style={gridStyle}>
                {daysOfWeek.slice(0, cols).map((d, i) => (
                    <div key={`header-${i}`} style={headerStyle}>
                        {d}
                    </div>
                ))}
                {displayCells.map((v, i) => (
                    <div key={i} style={cellStyle}>
                        {v !== null ? v : ""}
                    </div>
                ))}
            </div>
        </div>
    );
}
