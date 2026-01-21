// Import React hooku useState na prácu so stavom komponentu
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';

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

    const navigate = useNavigate(); // na presmerovanie po prihlásení
    const { setAuth } = useAuth();

    // Redirect to dashboard if already authenticated
    const { auth, loading: authLoading } = useAuth();
    React.useEffect(() => {
        if (!authLoading && auth) navigate('/');
    }, [auth, authLoading]);

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
            // Odoslanie POST požiadavky na server
            const data = await api.post(`/?c=login&a=login`, { email, password });

            // Ak bolo prihlásenie úspešné
            setErrors({});
            setSuccess(data?.message || "Prihlásenie úspešné");
            try { localStorage.setItem("isLoggedIn", "1"); } catch (e) {}
            // Persist basic user info returned from backend so other parts of the app can read it
            try {
                if (data && data.status === 'ok') {
                    const user = { id: data.id, name: data.name };
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }
            } catch (e) {}
            try { setAuth(true); } catch (e) {}
            try { window.dispatchEvent(new Event('app:logged-in')); } catch (e) {}
            setLoading(false);
            navigate('/');

        } catch (err) {
            setLoading(false);
            // err.status === 401 -> invalid credentials
            if (err.status === 401) {
                setErrors({ general: err.message || 'Nesprávne prihlasovacie údaje' });
            } else {
                setErrors({ general: err.message || 'Nepodarilo sa spojiť so serverom' });
            }
        }
    }

    // Vykreslenie formulára
    return (
        <div className="flex flex-col items-center w-full">
            <form onSubmit={handleSubmit} className="w-full max-w-xl min-h-[400px] mx-auto p-8 bg-white shadow rounded-xl flex flex-col justify-center" noValidate>

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

                {/* Odkaz na registráciu */}
                <div className="mt-6 text-center">
                    <span className="text-gray-600">Nemáte účet? </span>
                    <Link to="/register" className="text-blue-600 hover:underline font-medium">Zaregistrujte sa</Link>
                </div>
            </form>
        </div>
    );
}
