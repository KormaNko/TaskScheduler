// Import React hooku useState, ktorý slúži na ukladanie stavových premenných
import { useState } from "react";

import { Link } from "react-router-dom";
import api from '../lib/api';



// Hlavná React komponenta pre registráciu používateľa
export default function Register() {

    // Jeden spoločný stav pre celý formulár (všetky vstupné polia)
    const [form, setForm] = useState({
        firstName: "",   // krstné meno používateľa
        lastName: "",    // priezvisko používateľa
        email: "",       // email používateľa
        password: "",    // heslo používateľa
        isStudent: false, // informácia, či je používateľ študent
    });

    // Stav na ukladanie chýb ku konkrétnym poliam + všeobecná chyba
    const [errors, setErrors] = useState({});

    // Stav určujúci, či prebieha odosielanie formulára na server
    const [loading, setLoading] = useState(false);

    // Stav pre úspešnú správu po správnej registrácii
    const [success, setSuccess] = useState("");

    // Univerzálna funkcia na spracovanie zmien v input poliach
    function onChange(field) {
        return (e) => {

            // Ak ide o checkbox (isStudent), berie sa checked, inak value
            const value = field === "isStudent"
                ? e.target.checked
                : e.target.value;

            // Aktualizácia konkrétneho poľa vo formulári
            setForm((f) => ({ ...f, [field]: value }));

            // Odstránenie chyby pre konkrétne pole
            setErrors((prev) => ({ ...prev, [field]: undefined }));

            // Vymazanie úspešnej správy pri zmene údajov
            setSuccess("");
        };
    }

    // Funkcia na klientskú validáciu údajov pred odoslaním na server
    function validate() {
        const e = {}; // Objekt na ukladanie validančných chýb

        // Kontrola, či je krstné meno vyplnené
        if (!form.firstName.trim()) {
            e.firstName = "First name is required";
        }

        // Kontrola, či je priezvisko vyplnené
        if (!form.lastName.trim()) {
            e.lastName = "Last name is required";
        }

        // Kontrola, či je email vyplnený
        if (!form.email.trim()) {
            e.email = "Email is required";
        }
        // Kontrola formátu emailu pomocou regulárneho výrazu
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
            e.email = "Invalid email";
        }

        // Kontrola dĺžky hesla
        if (!form.password || form.password.length < 6) {
            e.password = "Min 6 characters";
        }

        // Vrátenie zoznamu chýb
        return e;
    }

    // Funkcia, ktorá sa zavolá po odoslaní formulára
    async function handleSubmit(e) {

        // Zruší klasický reload stránky po odoslaní formulára
        e.preventDefault();

        // Spustenie validácie
        const eMap = validate();

        // Nastavenie chýb do stavu
        setErrors(eMap);

        // Vymazanie starej úspešnej správy
        setSuccess("");

        // Ak existujú chyby, formulár sa neodošle
        if (Object.keys(eMap).length) return;

        // Zapnutie stavu načítavania
        setLoading(true);

        try {
            // Use central api wrapper so VITE_API_BASE and credentials are respected
            const payload = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                password: form.password,
                isStudent: form.isStudent ? 1 : 0,
            };

            const data = await api.post(`/?c=register&a=register`, payload);

            // Use server-provided message when available, fallback to default
            setSuccess(data?.message || "Registration successful");
            setErrors({}); // vymazanie chýb

            // Vyčistenie formulára
            setForm({
                firstName: "",
                lastName: "",
                email: "",
                password: "",
                isStudent: false,
            });
        }

        // Handle errors thrown by api wrapper (includes HTTP errors and network errors)
        catch (err) {
            // If backend returned field-specific errors in err.response.errors, merge them
            if (err && err.response && typeof err.response === 'object' && err.response.errors) {
                setErrors((prev) => ({ ...prev, ...err.response.errors }));
            }
            // If backend returned a message or the api wrapper threw a message, show it as general error
            else if (err && err.message) {
                setErrors((prev) => ({ ...prev, general: err.message }));
            }
            // Fallback
            else {
                setErrors((prev) => ({ ...prev, general: "Request failed" }));
            }

            // Vymazanie úspešnej správy
            setSuccess("");
        }

            // V každom prípade sa vypne loading
        finally {
            setLoading(false);
        }
    }

    // HTML (JSX) rozhranie registračného formulára
    //AI
    return (
        <div className="flex flex-col items-center w-full">
            <form onSubmit={handleSubmit} className="w-full max-w-xl min-h-[400px] mx-auto p-8 bg-white shadow rounded-xl flex flex-col justify-center" noValidate>

                {/* Nadpis formulára */}
                <h2 className="text-2xl font-bold mb-4">Registrácia</h2>

                {/* Všeobecná chyba zo servera */}
                {errors.general && <div className="mb-4 text-sm text-red-600">{errors.general}</div>}

                {/* Správa pri úspešnej registrácii */}
                {success && <div className="mb-4 text-sm text-green-600">{success}</div>}

                {/* Pole pre meno */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">Meno</span>
                    <input
                        type="text"
                        placeholder="Meno"
                        value={form.firstName}
                        onChange={onChange("firstName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.firstName ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </label>

                {/* Pole pre priezvisko */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">Priezvisko</span>
                    <input
                        type="text"
                        placeholder="Priezvisko"
                        value={form.lastName}
                        onChange={onChange("lastName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.lastName ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </label>

                {/* Pole pre email */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">Email</span>
                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={onChange("email")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.email ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </label>

                {/* Pole pre heslo */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">Heslo</span>
                    <input
                        type="password"
                        placeholder="Heslo"
                        value={form.password}
                        onChange={onChange("password")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.password ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </label>

                {/* Checkbox pre študenta */}
                <label className="flex items-center mb-4">
                    <input
                        type="checkbox"
                        checked={form.isStudent}
                        onChange={onChange("isStudent")}
                        className="mr-2"
                    />
                    <span className="text-sm">Som študent</span>
                </label>

                {/* Tlačidlo na odoslanie formulára */}
                <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading}>
                    {loading ? "Odosielam..." : "Registrovať"}
                </button>

                {/* Odkaz na prihlásenie */}
                <div className="mt-6 text-center">
                    <span className="text-gray-600">Máte účet? </span>
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">Prihláste sa</Link>
                </div>
            </form>
        </div>
    );
}
