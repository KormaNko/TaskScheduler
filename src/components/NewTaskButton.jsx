import React from "react";



export  default  function NewTaskButton({onClick}) {
    return (
        <button onClick={onClick} className="px-4 py-2 bg-black text-white rounded hover:bg-blue-600" > Nova uloha
            </button>
    );
}
