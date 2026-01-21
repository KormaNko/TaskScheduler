import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext.jsx';

const OptionsContext = createContext(null);
//AI
const TRANSLATIONS = {
  SK: {
    settings: 'Nastavenia',
    saveSettings: 'Uložiť nastavenia',
    reset: 'Obnoviť',
    tasksDashboard: 'Zoznam úloh',
    switchToSimple: 'Prepnúť na jednoduchý',
    switchToDetailed: 'Prepnúť na detailný',
    // also accept older/newer key names used elsewhere
    switchViewSimple: 'Prepnúť na jednoduchý',
    switchViewDetailed: 'Prepnúť na detailný',
    dashboard: 'Dashboard',
    calendar: 'Kalendár',
    categories: 'Kategórie',
    users: 'Používatelia',
    taskManager: 'Task Manager',
    newTask: 'Nová úloha',
    searchPlaceholder: 'Hľadať podľa názvu alebo ID',
    all: 'Všetky',
    pending: 'Čaká',
    in_progress: 'Prebieha',
    completed: 'Dokončené',
    create: 'Vytvoriť',
    creating: 'Vytváram...',
    createFailed: 'Vytvorenie zlyhalo',
    save: 'Uložiť',
    saving: 'Ukladám...',
    cancel: 'Zrušiť',
    edit: 'Upraviť',
    delete: 'Zmazať',
    newCategory: 'Nová kategória',
    categoryManager: 'Správca kategórií',
    noCategories: 'Žiadne kategórie',
    loadingCategories: 'Načítavam kategórie…',
    name: 'Meno',
    color: 'Farba',
    clear: 'Vymazať',
    noTasks: 'Žiadne úlohy',
    noMatchingTasks: 'Nenašli sa žiadne úlohy',
    loading: 'Načítavam...',
    usersTitle: 'Používatelia',
    newUser: 'Nový používateľ',
    loadingUsers: 'Načítavam používateľov...',
    noUsers: 'Žiadni používatelia',
    firstName: 'Meno',
    lastName: 'Priezvisko',
    email: 'Email',
    password: 'Heslo',
    isStudent: 'Je študent',
    yes: 'Áno',
    no: 'Nie',
    start: 'Spustiť',
    complete: 'Dokončiť',
    // table headers and misc
    id: 'ID',
    title: 'Názov',
    statusLabel: 'Stav',
    prio: 'Prio',
    categoryLabel: 'Kategória',
    deadline: 'Termín',
    created: 'Vytvorené',
    updated: 'Aktualizované',
    actions: 'Akcie',
    tasks: 'Úlohy',
    description: 'Popis',
    view_day: 'Deň',
    view_3days: '3 dni',
    view_week: 'Týždeň',
    view_month: 'Mesiac',
    prev: 'Pred',
    today: 'Dnes',
    next: 'Nasl',
    editCategory: 'Upraviť kategóriu',
    createCategory: 'Vytvoriť kategóriu',
    editUser: 'Upraviť používateľa',
    createUser: 'Nový používateľ',
    // user/messages
    confirmDeleteUser: 'Naozaj zmazať používateľa?',
    userCreateFailed: 'Vytvorenie používateľa zlyhalo',
    userUpdateFailed: 'Úprava používateľa zlyhala',
    userDeleteFailed: 'Mazanie používateľa zlyhalo',
    nameRequired: 'Meno je povinné',
    lastNameRequired: 'Priezvisko je povinné',
    emailRequired: 'Email je povinný',
    invalidEmail: 'Neplatný email',
    passwordTooShort: 'Heslo musí mať aspoň 6 znakov',
    actionFailed: 'Akcia zlyhala',
    // options/settings page specific
    language: 'Jazyk',
    theme: 'Téma',
    taskFilter: 'Filter úloh',
    taskSort: 'Zoradenie úloh',
    loadingSettings: 'Načítavam nastavenia...',
  },
  EN: {
    settings: 'Settings',
    saveSettings: 'Save settings',
    reset: 'Reset',
    tasksDashboard: 'Tasks Dashboard',
    switchToSimple: 'Switch to Simple',
    switchToDetailed: 'Switch to Detailed',
    // also accept older/newer key names used elsewhere
    switchViewSimple: 'Switch to Simple',
    switchViewDetailed: 'Switch to Detailed',
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    categories: 'Categories',
    users: 'Users',
    taskManager: 'Task Manager',
    newTask: 'New task',
    searchPlaceholder: 'Search by title or ID',
    all: 'All',
    pending: 'Pending',
    in_progress: 'In progress',
    completed: 'Completed',
    create: 'Create',
    creating: 'Creating...',
    createFailed: 'Create failed',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    newCategory: 'New Category',
    categoryManager: 'Category Manager',
    noCategories: 'No categories',
    loadingCategories: 'Loading categories…',
    name: 'Name',
    color: 'Color',
    clear: 'Clear',
    noTasks: 'No tasks',
    noMatchingTasks: 'No matching tasks',
    loading: 'Loading...',
    usersTitle: 'Users',
    newUser: 'New user',
    loadingUsers: 'Loading users...',
    noUsers: 'No users',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    password: 'Password',
    isStudent: 'Is student',
    yes: 'Yes',
    no: 'No',
    start: 'Start',
    complete: 'Complete',
    // table headers and misc
    id: 'ID',
    title: 'Title',
    statusLabel: 'Status',
    prio: 'Prio',
    categoryLabel: 'Category',
    deadline: 'Deadline',
    created: 'Created',
    updated: 'Updated',
    actions: 'Actions',
    tasks: 'Tasks',
    description: 'Description',
    view_day: 'Day',
    view_3days: '3 days',
    view_week: 'Week',
    view_month: 'Month',
    prev: 'Prev',
    today: 'Today',
    next: 'Next',
    editCategory: 'Edit category',
    createCategory: 'Create category',
    editUser: 'Edit user',
    createUser: 'New user',
    // user/messages
    confirmDeleteUser: 'Are you sure you want to delete this user?',
    userCreateFailed: 'User creation failed',
    userUpdateFailed: 'User update failed',
    userDeleteFailed: 'User delete failed',
    nameRequired: 'First name is required',
    lastNameRequired: 'Last name is required',
    emailRequired: 'Email is required',
    invalidEmail: 'Invalid email',
    passwordTooShort: 'Password must be at least 6 characters',
    actionFailed: 'Action failed',
    // options/settings page specific
    language: 'Language',
    theme: 'Theme',
    taskFilter: 'Task filter',
    taskSort: 'Task sorting',
    loadingSettings: 'Loading settings...',
  }
};

export function OptionsProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // watch auth so we can reload/clear user-specific options on login/logout
  const { auth, loading: authLoading } = useAuth();

  // helper: normalize theme to canonical 'light'|'dark'
  const normalizeTheme = (raw) => {
    if (raw === 'dark' || raw === 'Dark' || raw === 'DARK') return 'dark';
    if (raw === true || raw === 1 || raw === '1' || raw === 'true') return 'dark';
    return 'light';
  };

  // normalize incoming option object to consistent keys
    //AI
  const normalize = (d) => ({
    // prefer common keys, fall back to snake_case from API, default to sensible values
    language: d?.language ?? d?.lang ?? 'SK',
    theme: normalizeTheme(d?.theme ?? d?.the ?? 'light'),
    taskFilter: d?.taskFilter ?? d?.task_filter ?? 'all',
    taskSort: d?.taskSort ?? d?.task_sort ?? 'none',
    // keep raw data for components that might need other fields
    __raw: d,
  });

 //AI
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!auth) {
          // not authenticated: use default/empty options
          if (!cancelled) setOpts(normalize({}));
          return;
        }
        const data = await api.get('/?c=options&a=index');
        if (cancelled) return;
        setOpts(normalize(data || {}));
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
        setOpts(normalize({}));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (authLoading) return; // wait until auth check completes
    load();
    return () => { cancelled = true; };
  }, [auth, authLoading]);

 //AI
  useEffect(() => {
    try {
      const theme = opts?.theme ?? 'light';
      const el = document?.documentElement;
      if (!el) return;
      if (theme === 'dark') el.classList.add('app-dark');
      else el.classList.remove('app-dark');
    } catch (e) { /* ignore */ }
  }, [opts?.theme]);

  //AI
  async function saveOptions(payload) {
    setSaving(true);
    setError(null);
    // optimistic update: apply payload locally immediately so UI responds quickly.
    const prev = opts;
    try {
      // apply optimistic local state
      setOpts(normalize(payload || {}));
      const data = await api.post('/?c=options&a=update', payload);
      // prefer server-returned normalized data, but fall back to payload if server returns nothing
      const n = normalize(data || payload || {});
      setOpts(n);
      return { ok: true, data: n };
    } catch (e) {
      // revert optimistic change on failure
      try { setOpts(prev); } catch (err) { /* ignore */ }
      setError(e?.message || String(e));
      return { ok: false, error: e };
    } finally {
      setSaving(false);
    }
  }

  // convenience setter that updates local opts only (not persisted)
  function setLocal(k, v) {
    // coerce theme values to canonical strings if theme is being set
    const val = k === 'theme' ? normalizeTheme(v) : v;
    // avoid creating a new object if value didn't change to prevent loops
    setOpts((s) => {
      const current = s || {};
      if (current[k] === val) return current;
      return { ...current, [k]: val };
    });
  }

  // tiny translation helper exposed via context
  function t(key) {
    const lang = opts?.language ?? 'SK';
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS['EN'][key] || key;
  }

  const value = {
    opts,
    loading,
    saving,
    error,
    saveOptions,
    setLocal,
    t,
  };

  return <OptionsContext.Provider value={value}>{children}</OptionsContext.Provider>;
}

export function useOptions() {
  const ctx = useContext(OptionsContext);
  if (!ctx) throw new Error('useOptions must be used within OptionsProvider');
  return ctx;
}

export default OptionsContext;
