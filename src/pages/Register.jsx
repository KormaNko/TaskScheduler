import { useState } from "react";

export default function Register() {
    const [form, setForm] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    function validate() {
        const e = {};
        if (!form.firstName.trim()) e.firstName = "First name is required";
        if (!form.lastName.trim()) e.lastName = "Last name is required";
        if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
        if (!form.password || form.password.length < 8) e.password = "Min 8 characters";
        if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords do not match";
        return e;
    }

    async function handleSubmit(ev) {
        ev.preventDefault();
        setErrors({});
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        setLoading(true);
        // Frontend-only demo: simulate request
        setTimeout(() => {
            setLoading(false);
            alert("Registered successfully (frontend demo)");
        }, 700);
    }

    function onChange(field) {
        return (ev) => setForm((f) => ({ ...f, [field]: ev.target.value }));
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md bg-white shadow rounded p-6"
                noValidate
            >
                <h1 className="text-2xl font-bold mb-4">Register</h1>

                {errors.general && (
                    <div className="mb-4 text-sm text-red-600">{errors.general}</div>
                )}

                <label className="block mb-3">
                    <span className="text-sm font-medium">First name</span>
                    <input
                        type="text"
                        value={form.firstName}
                        onChange={onChange("firstName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.firstName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="John"
                    />
                    {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Last name</span>
                    <input
                        type="text"
                        value={form.lastName}
                        onChange={onChange("lastName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.lastName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Doe"
                    />
                    {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                    )}
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Email</span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={onChange("email")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.email ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="john.doe@example.com"
                    />
                    {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Password</span>
                    <input
                        type="password"
                        value={form.password}
                        onChange={onChange("password")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.password ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="********"
                    />
                    {errors.password && (
                        <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                    )}
                </label>

                <label className="block mb-4">
                    <span className="text-sm font-medium">Confirm password</span>
                    <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={onChange("confirmPassword")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.confirmPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="********"
                    />
                    {errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.confirmPassword}
                        </p>
                    )}
                </label>

                <button
                    type="submit"
                    className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-60"
                    disabled={loading}
                >
                    {loading ? "Submitting..." : "Create account"}
                </button>
            </form>
        </div>
    );
}
