import React, { useState, useEffect, useRef } from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';

interface ExpensePayment {
  id: number;
  expense: number;
  paid_date: string;
  amount: number;
  comment?: string;
}

interface Expense {
  id: number;
  name: string;
  amount: number;
  currency: number | Currency;
  date: string;
  asset: number | null;
  liability: number | null;
  category: number | null;
  type: string;
  owner: number | null;
  family: number | null;
  is_family: boolean;
  created_at: string;
  updated_at: string;
  recurrence_type?: 'none' | 'monthly' | 'weekly';
  payments?: ExpensePayment[];
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

interface Category {
  id: number;
  name: string;
}

const API_URL = 'http://localhost:8000/api/finance/expenses/';
const CURRENCIES_URL = 'http://localhost:8000/api/finance/currencies/';
const CATEGORIES_URL = 'http://localhost:8000/api/finance/categories/';
const PAGE_SIZE = 10;

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<number | ''>('');
  const [formCategory, setFormCategory] = useState<number | ''>('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState('mandatory');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Состояния для контекстного меню оплаты
  const [payMenuOpenId, setPayMenuOpenId] = useState<number | null>(null);
  const [payMenuAnchor, setPayMenuAnchor] = useState<HTMLElement | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  // 1. Добавляю состояние для выбранной даты оплаты в меню
  const [payDate, setPayDate] = useState<string>('');
  const payMenuRef = useRef<HTMLDivElement>(null);

  // Справочники
  const fetchDictionaries = async () => {
    try {
      const token = localStorage.getItem('token');
      const [currResp, catResp] = await Promise.all([
        fetch(CURRENCIES_URL, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(CATEGORIES_URL, { headers: { 'Authorization': `Token ${token}` } })
      ]);
      if (!currResp.ok || !catResp.ok) throw new Error('Ошибка загрузки справочников');
      setCurrencies(await currResp.json());
      setCategories(await catResp.json());
    } catch (e: any) {
      setError(e.message || 'Ошибка справочников');
    }
  };

  // Загрузка расходов с backend (с пагинацией)
  const fetchExpenses = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_URL}?limit=${PAGE_SIZE}&offset=${(pageNum-1)*PAGE_SIZE}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!resp.ok) throw new Error('Ошибка загрузки расходов');
      const data = await resp.json();
      // Если backend не возвращает count/results, fallback к массиву
      if (Array.isArray(data)) {
        setExpenses(data.slice(0, PAGE_SIZE));
        setTotalCount(data.length);
      } else {
        setExpenses(data.results || []);
        setTotalCount(data.count || (data.results ? data.results.length : 0));
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDictionaries();
    fetchExpenses(page);
    // eslint-disable-next-line
  }, [page]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        payMenuAnchor && !payMenuAnchor.contains(e.target as Node) &&
        payMenuRef.current && !payMenuRef.current.contains(e.target as Node)
      ) {
        setPayMenuOpenId(null);
        setPayMenuAnchor(null);
        setPayDate('');
      }
    }
    if (payMenuOpenId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [payMenuOpenId, payMenuAnchor]);

  const getCurrency = (id: number) => {
    const cur = currencies.find(c => c.id === id);
    return cur ? (cur.symbol || cur.code) : '';
  };
  const getCategory = (id: number | null) => categories.find(c => c.id === id)?.name || '';

  // 3. Функция для определения оплаченности (по paid_date)
  function isExpensePaid(exp: Expense): { paid: boolean, paidDate?: string, paymentId?: number } {
    if (!exp.payments || exp.payments.length === 0) return { paid: false };
    if (!exp.recurrence_type || exp.recurrence_type === 'none') {
      // Разовый: любая оплата
      return { paid: true, paidDate: exp.payments[0].paid_date, paymentId: exp.payments[0].id };
    } else if (exp.recurrence_type === 'monthly') {
      // Ежемесячный: ищем оплату с paid_date в выбранном месяце/году
      const payment = exp.payments.find(p => {
        const d = new Date(p.paid_date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
      if (payment) return { paid: true, paidDate: payment.paid_date, paymentId: payment.id };
      return { paid: false };
    } else if (exp.recurrence_type === 'weekly') {
      // Еженедельный: ищем оплату с paid_date в текущей неделе
      // (упрощённо: неделя — с понедельника)
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      // Найдём текущую неделю (по today)
      const today = new Date();
      let weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Пн
      let weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Вс
      const payment = exp.payments.find(p => {
        const d = new Date(p.paid_date);
        return d >= weekStart && d <= weekEnd;
      });
      if (payment) return { paid: true, paidDate: payment.paid_date, paymentId: payment.id };
      return { paid: false };
    }
    return { paid: false };
  }

  // 4. Обработчики для оплаты/отмены оплаты
  // 2. Модифицирую handleMarkPaid для использования выбранной даты
  const handleMarkPaid = async (exp: Expense, date: string) => {
    setPayLoading(true);
    setError(null);
    try {
      if (!exp.id) {
        setError('Некорректный расход (нет id)');
        setPayLoading(false);
        console.error('Ошибка: нет id расхода', exp);
        return;
      }
      if (!date) {
        setError('Выберите дату оплаты');
        setPayLoading(false);
        console.error('Ошибка: не выбрана дата оплаты');
        return;
      }
      const token = localStorage.getItem('token');
      const paid_date = date;
      console.log('Отправка оплаты:', { id: exp.id, paid_date, amount: exp.amount });
      const resp = await fetch(`${API_URL}${exp.id}/pay/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_date, amount: exp.amount })
      });
      const respText = await resp.text();
      let data = null;
      try { data = JSON.parse(respText); } catch {}
      console.log('Ответ pay:', resp.status, data || respText);
      if (!resp.ok) {
        setError((data && data.detail) || 'Ошибка оплаты');
        console.error('Ошибка оплаты:', data || respText);
        return;
      }
      await fetchExpenses(page);
      setPayMenuOpenId(null);
      setPayMenuAnchor(null);
      setPayDate('');
    } catch (e: any) {
      setError(e.message || 'Ошибка оплаты');
      console.error('Ошибка оплаты:', e);
    } finally {
      setPayLoading(false);
    }
  };
  const handleUnmarkPaid = async (exp: Expense, paidDate?: string) => {
    setPayLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_URL}${exp.id}/unpay/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_date: paidDate })
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || 'Ошибка отмены оплаты');
      }
      await fetchExpenses(page);
      setPayMenuOpenId(null);
      setPayMenuAnchor(null);
    } catch (e: any) {
      setError(e.message || 'Ошибка отмены оплаты');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(totalCount / PAGE_SIZE)) return;
    setPage(newPage);
  };

  // Сортировка расходов по дате (от новых к старым)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Фильтрация расходов по выбранному месяцу и году
  const filteredExpenses = sortedExpenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Для выпадающего списка месяцев текущего года
  const monthsOfYear = Array.from({ length: 12 }, (_, i) => i);

  // Переключение месяцев
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };
  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(e.target.value));
  };

  // Сброс формы
  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormCategory('');
    setFormDate('');
    setFormType('mandatory');
    setShowForm(false);
    setError(null);
  };

  // Обработчик добавления расхода
  const handleAddExpense = async () => {
    setError(null);
    if (!formName.trim() || isNaN(Number(formAmount)) || !formCurrency || !formDate) {
      setError('Заполните все обязательные поля');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const body = {
        name: formName,
        amount: Number(formAmount),
        currency: formCurrency,
        category: formCategory || null,
        date: formDate,
        type: formType,
      };
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        let message = 'Ошибка добавления';
        try {
          const data = await resp.json();
          message = Object.values(data).flat().join(' ');
        } catch {}
        throw new Error(message);
      }
      await fetchExpenses(page);
      resetForm();
    } catch (e: any) {
      setError(e.message || 'Ошибка добавления');
    }
  };

  // Обработчик удаления расхода
  const handleDeleteExpense = async (id: number) => {
    setError(null);
    setDeleteModalOpen(false);
    setExpenseToDelete(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_URL}${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (resp.status !== 204 && resp.status !== 200) throw new Error('Ошибка удаления');
      const prevPage = page;
      await fetchExpenses(page);
      setTimeout(() => {
        if (filteredExpenses.length === 0 && prevPage > 1) {
          setPage(prevPage - 1);
        }
      }, 0);
    } catch (e: any) {
      setError(e.message || 'Ошибка удаления');
    }
  };

  return (
    <div className="expenses-page">
      <h2>Расходы</h2>
      {/* --- Фильтр по месяцу --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={handlePrevMonth}>&lt;</button>
        <span style={{ fontWeight: 500, fontSize: 17 }}>{MONTHS[selectedMonth]} {selectedYear}</span>
        <button onClick={handleNextMonth}>&gt;</button>
        <select value={selectedMonth} onChange={handleMonthSelect} style={{ marginLeft: 8 }}>
          {monthsOfYear.map(m => (
            <option key={m} value={m}>{MONTHS[m]}</option>
          ))}
        </select>
      </div>
      {/* Кнопка добавить расход */}
      {/* УДАЛЯЕМ отдельную кнопку над таблицей */}
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <>
          {/* --- Стили для таблицы расходов и кнопок --- */}
          <style>{`
            .icon-btn {
              width: 32px;
              height: 32px;
              min-width: 32px;
              min-height: 32px;
              border: none;
              background: #f5f5f5;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              margin-right: 4px;
              transition: background 0.2s;
            }
            .icon-btn:hover {
              background: #e0e0e0;
            }
            .icon-btn.danger {
              color: #d32f2f;
            }
            .expenses-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              background: #fff;
              box-shadow: 0 2px 8px #0001;
              border-radius: 12px;
              overflow: hidden;
            }
            .expenses-table thead tr {
              background: #f7f7fa;
              border-bottom: 2px solid #e0e0e0;
            }
            .expenses-table th {
              padding: 14px 12px;
              font-weight: 600;
              font-size: 15px;
              color: #333;
              text-align: left;
            }
            .expenses-table tbody tr {
              border-bottom: 1px solid #ececec;
              transition: background 0.18s;
            }
            .expenses-table tbody tr:last-child {
              border-bottom: none;
            }
            .expenses-table td {
              padding: 12px 12px;
              font-size: 15px;
              color: #222;
            }
            .expenses-table td.actions {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .expenses-table tbody tr:hover {
              background: #f0f4ff;
            }
            .expense-form-row td {
              background: #f9f9fc;
            }
            .expense-add-row {
              background: #f7fafc;
              border-bottom: 2px solid #b3c0d1;
              border-top: 2px solid #b3c0d1;
              box-shadow: 0 2px 6px 0 rgba(44, 62, 80, 0.04);
              font-weight: 500;
              transition: background 0.2s;
              cursor: pointer;
            }
            .expense-add-row td {
              color: #888;
              font-style: italic;
              text-align: center;
              padding: 14px 0;
            }
          `}</style>
          <table className="expenses-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Оплачен</th>
                <th>Наименование</th>
                <th>Сумма</th>
                <th>Категория</th>
                <th>Дата</th>
                <th>Тип</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* Строка добавления нового расхода (как на активы) */}
              {!showForm && (
                <tr className="expense-add-row" onClick={() => { resetForm(); setShowForm(true); }}>
                  <td colSpan={7}>+ Добавить расход</td>
                </tr>
              )}
              {/* Строка формы добавления */}
              {showForm && (
                <>
                  {error && (
                    <tr className="expense-form-error-row">
                      <td colSpan={7}>
                        <div className="error" style={{ marginBottom: 8 }}>{error}</div>
                      </td>
                    </tr>
                  )}
                  <tr className="expense-form-row">
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <button className="icon-btn" title="Добавить" onClick={handleAddExpense}>
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#2a3b6d" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                        <button className="icon-btn" title="Отмена" onClick={resetForm}>
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </td>
                    <td><input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Наименование" /></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="Сумма" style={{ width: 90 }} />
                        <select value={formCurrency} onChange={e => setFormCurrency(Number(e.target.value))} style={{ width: 60 }}>
                          {currencies.map(cur => <option key={cur.id} value={cur.id}>{cur.symbol || cur.code}</option>)}
                        </select>
                      </div>
                    </td>
                    <td>
                      <select value={formCategory} onChange={e => setFormCategory(Number(e.target.value))}>
                        <option value="">—</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </td>
                    <td><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></td>
                    <td>
                      <select value={formType} onChange={e => setFormType(e.target.value)}>
                        <option value="mandatory">Обязательный</option>
                        <option value="optional">Необязательный</option>
                      </select>
                    </td>
                  </tr>
                </>
              )}
              {/* Список расходов */}
              {filteredExpenses.map(exp => {
                const { paid, paidDate } = isExpensePaid(exp);
                return (
                  <tr key={exp.id} style={paid ? { background: '#e8fbe8' } : {}}>
                    <td style={{ textAlign: 'center', position: 'relative' }}>
                      {paid ? (
                        <span
                          title={paidDate}
                          style={{ color: '#388e3c', fontWeight: 600, fontSize: 18, cursor: 'pointer' }}
                          onClick={e => {
                            setPayMenuOpenId(exp.id);
                            setPayMenuAnchor(e.currentTarget);
                            setPayDate(paidDate || new Date().toISOString().slice(0, 10));
                          }}
                        >✔</span>
                      ) : (
                        <span
                          style={{ color: '#d32f2f', cursor: 'pointer' }}
                          onClick={e => {
                            setPayMenuOpenId(exp.id);
                            setPayMenuAnchor(e.currentTarget);
                            setPayDate(exp.date); // теперь по умолчанию дата расхода
                          }}
                        >нет</span>
                      )}
                      {/* Контекстное меню для оплаты/отмены оплаты */}
                      {payMenuOpenId === exp.id && (
                        <div
                          ref={payMenuRef}
                          style={{
                            position: 'absolute',
                            top: 28,
                            left: 0,
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: 12,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            zIndex: 10,
                            minWidth: 240,
                            padding: '12px 8px'
                          }}
                        >
                          {!paid ? (
                            <>
                              <div style={{ 
                                marginBottom: 8, 
                                fontSize: 16, 
                                fontWeight: 500,
                                color: '#333'
                              }}>Отметить оплаченным?</div>
                              <div style={{ marginBottom: 12 }}>
                                <input
                                  type="date"
                                  value={payDate}
                                  onChange={e => setPayDate(e.target.value)}
                                  style={{ 
                                    width: 140,
                                    padding: '6px 10px',
                                    fontSize: 14,
                                    border: '1px solid #ddd',
                                    borderRadius: 6,
                                    outline: 'none'
                                  }}
                                  max={new Date().toISOString().slice(0, 10)}
                                />
                              </div>
                              {error && (
                                <div style={{ 
                                  color: '#d32f2f', 
                                  fontSize: 13, 
                                  marginBottom: 8,
                                  padding: '6px 10px',
                                  background: '#ffebee',
                                  borderRadius: 6,
                                  border: '1px solid #ffcdd2'
                                }}>{error}</div>
                              )}
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button
                                  className="icon-btn"
                                  style={{ 
                                    minWidth: 70,
                                    padding: '4px 12px',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#f5f5f5',
                                    color: '#333',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8f5e8'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                  disabled={payLoading || !payDate}
                                  onClick={() => handleMarkPaid(exp, payDate)}
                                >Да</button>
                                <button
                                  className="icon-btn"
                                  style={{ 
                                    minWidth: 70,
                                    padding: '4px 12px',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#f5f5f5',
                                    color: '#666',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#ffeaea'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                  onClick={() => { setPayMenuOpenId(null); setPayMenuAnchor(null); setPayDate(''); }}
                                >Нет</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ 
                                marginBottom: 8, 
                                fontSize: 16, 
                                fontWeight: 500,
                                color: '#333'
                              }}>Отменить метку оплаты?</div>
                              {error && (
                                <div style={{ 
                                  color: '#d32f2f', 
                                  fontSize: 13, 
                                  marginBottom: 8,
                                  padding: '6px 10px',
                                  background: '#ffebee',
                                  borderRadius: 6,
                                  border: '1px solid #ffcdd2'
                                }}>{error}</div>
                              )}
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button
                                  className="icon-btn"
                                  style={{ 
                                    minWidth: 70,
                                    padding: '4px 12px',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#f5f5f5',
                                    color: '#333',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8f5e8'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                  disabled={payLoading}
                                  onClick={() => handleUnmarkPaid(exp, paidDate)}
                                >Да</button>
                                <button
                                  className="icon-btn"
                                  style={{ 
                                    minWidth: 70,
                                    padding: '4px 12px',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#f5f5f5',
                                    color: '#666',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#ffeaea'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                  onClick={() => { setPayMenuOpenId(null); setPayMenuAnchor(null); setPayDate(''); }}
                                >Нет</button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{exp.name}</td>
                    <td>{exp.amount} {typeof exp.currency === 'object' && exp.currency !== null ? (exp.currency.symbol || exp.currency.code) : getCurrency(exp.currency as number)}</td>
                    <td>{getCategory(exp.category)}</td>
                    <td>{exp.date}</td>
                    <td>{exp.type === 'mandatory' ? 'Обязательный' : 'Необязательный'}</td>
                    <td className="actions">
                      <button className="icon-btn" title="Редактировать"><MdEdit /></button>
                      <button className="icon-btn danger" title="Удалить" onClick={() => { setExpenseToDelete(exp); setDeleteModalOpen(true); }}><MdDelete color="#d32f2f" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="pagination">
            <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Назад</button>
            <span>Страница {page} из {Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))}</span>
            <button onClick={() => handlePageChange(page + 1)} disabled={page >= Math.ceil(filteredExpenses.length / PAGE_SIZE)}>Вперёд</button>
          </div>
        </>
      )}
      {/* Модальное окно подтверждения удаления */}
      {deleteModalOpen && expenseToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Удалить расход?</h3>
            <div style={{ margin: '12px 0 18px 0', fontSize: 15 }}>
              Вы действительно хотите удалить расход <b>"{expenseToDelete.name}"</b> на сумму <b>{expenseToDelete.amount} {typeof expenseToDelete.currency === 'object' && expenseToDelete.currency !== null ? (expenseToDelete.currency.symbol || expenseToDelete.currency.code) : getCurrency(expenseToDelete.currency as number)}</b>?
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="icon-btn" onClick={() => setDeleteModalOpen(false)}>Отмена</button>
              <button className="icon-btn danger" onClick={() => handleDeleteExpense(expenseToDelete.id)}>Удалить</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: #fff;
          border-radius: 8px;
          padding: 32px 24px 24px 24px;
          min-width: 320px;
          box-shadow: 0 2px 16px #0002;
        }
        .modal .icon-btn {
          min-width: 90px;
          padding: 8px 18px;
          font-size: 15px;
          font-weight: 500;
          border-radius: 6px;
          border: none;
          background: #f5f5f5;
          color: #2a3b6d;
          transition: background 0.18s, color 0.18s;
        }
        .modal .icon-btn:hover {
          background: #e0e0e0;
        }
        .modal .icon-btn.danger {
          background: #ffeaea;
          color: #d32f2f;
        }
        .modal .icon-btn.danger:hover {
          background: #ffd6d6;
          color: #b71c1c;
        }
      `}</style>
    </div>
  );
};

export default ExpensesPage; 