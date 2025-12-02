import { useState } from "react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    function handleSubmit(e) {
        e.preventDefault();


        if (!email.includes("@")) {
            setError("Email nie je platný");
            return;
        }

        if (password.length < 8) {
            setError("Heslo musí mať aspoň 8 znakov");
            return;
        }

        setError("");
        alert("KLIENTSKÁ KONTROLA PREŠLA");
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Prihlásenie</h2>

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />

            <input
                type="password"
                placeholder="Heslo"
                value={password}
                onChange={e => setPassword(e.target.value)}
            />

            <button type="submit">Prihlásiť</button>

            {error && <p>{error}</p>}
        </form>
    );
}
