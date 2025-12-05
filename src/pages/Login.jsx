// Import React hooku useState na prácu so stavom komponentu
import { useState } from "react";

// Základná URL adresa backendu z .env súboru alebo fallback na localhost
// Zároveň sa odstraňuje lomka na konci URL, ak tam je
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost").replace(/\/$/, "");

// Definícia hlavného prihlasovacieho komponentu
export default function Login() {

    // Stav pre email z formulára
    const [email, setEmail] = useState("");

    // Stav pre heslo z formulára
    const [password, setPassword] = useState("");

    // Stav pre chybové hlásenia (email, password, general)
    const [errors, setErrors] = useState({});

    // Stav pre indikáciu odosielania požiadavky
    const [loading, setLoading] = useState(false);

    // Stav pre úspešnú správu po prihlásení
    const [success, setSuccess] = useState("");

    // Funkcia na validáciu údajov na strane klienta
    function validateClientSide() {
        const e = {}; // Objekt na uloženie chýb

        // Kontrola správnosti emailu
        if (!email || !email.includes("@")) {
            e.email = "Email nie je platný";
        }

        // Kontrola dĺžky hesla
        if (!password || password.length < 8) {
            e.password = "Heslo musí mať aspoň 8 znakov";
        }

        // Vrátenie nájdených chýb
        return e;
    }

    // Funkcia na spracovanie odoslania formulára
    async function handleSubmit(e) {

        // Zrušenie predvoleného správania formulára (reload stránky)
        e.preventDefault();

        // Vymazanie starých chýb a úspešných správ
        setErrors({});
        setSuccess("");

        // Spustenie klientkej validácie
        const clientErrors = validateClientSide();

        // Ak existujú chyby, zobrazia sa a formulár sa neodošle
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            return;
        }

        // Zapnutie stavu načítavania
        setLoading(true);

        try {
            // Zostavenie URL adresy pre backend
            const url = `${API_BASE}/?c=login&a=login`;

            // Odoslanie POST požiadavky na server
            const res = await fetch(url, {
                method: "POST", // Typ HTTP metódy
                headers: { "Content-Type": "application/json" }, // Nastavenie hlavičky pre JSON
                credentials: "include", // Povolenie cookies (session)
                body: JSON.stringify({ email, password }), // Odoslanie emailu a hesla ako JSON
            });

            let data = null;

            try {
                // Pokus o načítanie JSON odpovede zo servera
                data = await res.json();
            } catch {
                // Ak server nevráti JSON, zobrazí sa všeobecná chyba
                setErrors({ general: `Chyba servera: ${res.status}` });
                setLoading(false);
                return;
            }

            // Ak HTTP odpoveď nie je úspešná (napr. 400, 401, 403)
            if (!res.ok) {

                // Ak server vrátil konkrétne chyby k poliam
                if (data.errors && typeof data.errors === "object") {
                    setErrors(data.errors);
                } else {
                    // Spracovanie rôznych stavových kódov
                    if (res.status === 401) {
                        setErrors({ general: data.message || "Nesprávne prihlasovacie údaje" });
                    } else if (res.status === 403) {
                        setErrors({ general: data.message || "Účet nie je povolený / email nie je overený" });
                    } else {
                        setErrors({ general: data.message || "Neznáma chyba servera" });
                    }
                }

                // Vypnutie načítavania
                setLoading(false);
                return;
            }

            // Ak bolo prihlásenie úspešné
            setErrors({});
            setSuccess(data.message || "Prihlásenie úspešné");

            // Voliteľné presmerovanie po úspešnom prihlásení
            // window.location.href = '/?c=Home&a=index';

            // Vypnutie načítavania
            setLoading(false);

        } catch (err) {
            // Ak sa nepodarilo spojiť so serverom
            setErrors({ general: "Nepodarilo sa spojiť so serverom" });
            setLoading(false);
        }
    }

    // Vykreslenie formulára
    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white shadow rounded" noValidate>

            {/* Nadpis formulára */}
            <h2 className="text-2xl font-bold mb-4">Prihlásenie</h2>

            {/* Všeobecná chyba zo servera */}
            {errors.general && <div className="mb-4 text-sm text-red-600">{errors.general}</div>}

            {/* Správa pri úspešnom prihlásení */}
            {success && <div className="mb-4 text-sm text-green-600">{success}</div>}

            {/* Pole pre email */}
            <label className="block mb-3">
                <span className="text-sm font-medium">Email</span>
                <input
                    autoFocus // Automaticky nastaví kurzor do poľa
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value); // Ukladá email do stavu
                        setErrors((prev) => ({ ...prev, email: undefined })); // Odstráni chybu emailu
                        setSuccess(""); // Zruší úspešnú správu
                    }}
                    className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.email ? "border-red-500" : "border-gray-300"}`}
                />
                {/* Chybová hláška pre email */}
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </label>

            {/* Pole pre heslo */}
            <label className="block mb-4">
                <span className="text-sm font-medium">Heslo</span>
                <input
                    type="password"
                    placeholder="Heslo"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value); // Ukladá heslo do stavu
                        setErrors((prev) => ({ ...prev, password: undefined })); // Odstráni chybu hesla
                        setSuccess(""); // Zruší úspešnú správu
                    }}
                    className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.password ? "border-red-500" : "border-gray-300"}`}
                />
                {/* Chybová hláška pre heslo */}
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </label>

            {/* Tlačidlo na odoslanie formulára */}
            <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading}>
                {loading ? "Posielam..." : "Prihlásiť"}
            </button>

        </form>
    );
}
