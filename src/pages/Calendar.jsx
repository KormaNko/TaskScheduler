import React from "react";
import KalendarMesiac   from "../components/KalendarMesaic.jsx";

export default function Calendar() {

    const months = ["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"];



    return (
        <div className="min-h-screen">
            <h1 className = "left-3 top-3">Kalendar</h1>

            <div className="p-6 mt-6 ">

                <KalendarMesiac rows={5} cols={7}   />
            </div>
        </div>
    );
}
