import React, { useState, useEffect } from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';

interface Liability {
  id: number;
  name: string;
  type: number | LiabilityType;
  initial_amount: number;
  currency: number | Currency;
  open_date: string;
  close_date?: string | null;
  interest_rate?: number | null;
  payment_type?: string | null;
  payment_date?: string | null;
  current_debt: number;
  is_family: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface LiabilityType {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

const API_URL = 'http://localhost:8000/api/finance/liabilities/';
const TYPES_URL = 'http://localhost:8000/api/finance/liability-types/';
const CURRENCIES_URL = 'http://localhost:8000/api/finance/currencies/';

const LiabilitiesPage: React.FC = () => {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [types, setTypes] = useState<LiabilityType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editLiability, setEditLiability] = useState<Liability | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<number | ''>('');
  const [formInitialAmount, setFormInitialAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<number | ''>('');
  const [formOpenDate, setFormOpenDate] = useState('');
  const [formCloseDate, setFormCloseDate] = useState('');
  const [formInterestRate, setFormInterestRate] = useState('');
  const [formPaymentType, setFormPaymentType] = useState('');
  const [formPaymentDate, setFormPaymentDate] = useState('');
  const [formIsFamily, setFormIsFamily] = useState(false);

  const getCurrency = (id: number) => {
    const cur = currencies.find(c => c.id === id);
    return cur ? (cur.symbol || cur.code) : '';
  };

  // Загрузка справочников
  const fetchDictionaries = async () => {
    try {
      const token = localStorage.getItem('token');
      const [typesResp, currResp] = await Promise.all([
        fetch(TYPES_URL, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(CURRENCIES_URL, { headers: { 'Authorization': `Token ${token}` } })
      ]);
      if (!typesResp.ok || !currResp.ok) throw new Error('Ошибка загрузки справочников');
      setTypes(await typesResp.json());
      setCurrencies(await currResp.json());
    } catch (e: any) {
      setError(e.message || 'Ошибка справочников');
    }
  };

  // Загрузка пассивов с backend
  const fetchLiabilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(API_URL, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!resp.ok) throw new Error('Ошибка загрузки пассивов');
      const data = await resp.json();
      setLiabilities(data);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDictionaries();
    fetchLiabilities();
  }, []);

  const handleAddClick = () => {
    setEditLiability(null);
    setFormName('');
    setFormType(types.length > 0 ? types[0].id : '');
    setFormInitialAmount('');
    setFormCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormOpenDate('');
    setFormCloseDate('');
    setFormInterestRate('');
    setFormPaymentType('');
    setFormPaymentDate('');
    setFormIsFamily(false);
    setError(null);
    setShowForm(true);
  };

  const handleEditClick = (liability: Liability) => {
    setEditLiability(liability);
    setFormName(liability.name);
    setFormType(typeof liability.type === 'object' ? liability.type.id : liability.type);
    setFormInitialAmount(liability.initial_amount?.toString() || '');
    setFormCurrency(typeof liability.currency === 'object' ? liability.currency.id : liability.currency);
    setFormOpenDate(liability.open_date || '');
    setFormCloseDate(liability.close_date || '');
    setFormInterestRate(liability.interest_rate?.toString() || '');
    setFormPaymentType(liability.payment_type || '');
    setFormPaymentDate(liability.payment_date || '');
    setFormIsFamily(liability.is_family || false);
    setShowForm(true);
    setError(null);
  };

  const handleDeleteClick = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_URL}${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!resp.ok) throw new Error('Ошибка удаления');
      setLiabilities(liabilities.filter(l => l.id !== id));
    } catch (e: any) {
      setError(e.message || 'Ошибка удаления');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formName.trim() || isNaN(Number(formInitialAmount))) return;
    const token = localStorage.getItem('token');
    const body = {
      name: formName,
      type: formType,
      initial_amount: Number(formInitialAmount),
      currency: formCurrency,
      open_date: formOpenDate,
      close_date: formCloseDate || null,
      interest_rate: formInterestRate ? Number(formInterestRate) : null,
      payment_type: formPaymentType || null,
      payment_date: formPaymentDate || null,
      is_family: formIsFamily,
    };
    try {
      if (editLiability) {
        const resp = await fetch(`${API_URL}${editLiability.id}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          let message = 'Ошибка сохранения';
          try {
            const data = await resp.json();
            message = Object.values(data).flat().join(' ');
          } catch {}
          throw new Error(message);
        }
        const updated = await resp.json();
        setLiabilities(liabilities.map(l => l.id === editLiability.id ? updated : l));
      } else {
        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
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
        const created = await resp.json();
        setLiabilities([...liabilities, created]);
      }
      setShowForm(false);
      setEditLiability(null);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    }
  };

  const handleEditCancel = () => {
    setEditLiability(null);
    setShowForm(false);
    setFormName('');
    setFormType(types.length > 0 ? types[0].id : '');
    setFormInitialAmount('');
    setFormCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormOpenDate('');
    setFormCloseDate('');
    setFormInterestRate('');
    setFormPaymentType('');
    setFormPaymentDate('');
    setFormIsFamily(false);
    setError(null);
  };

  return (
    <div>
      <h2>Мои Пассивы</h2>
      <div>
        {loading ? (
          <div>Загрузка...</div>
        ) : liabilities.length === 0 ? (
          <div>
            <p>У вас пока нет пассивов.</p>
          </div>
        ) : (
          <table className="assets-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Сумма</th>
                <th>Валюта</th>
                <th>Дата открытия</th>
                <th>Дата окончания</th>
                <th>Ставка %</th>
                <th>Тип платежа</th>
                <th>Дата платежа</th>
                <th>Семейный</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* Строка добавления нового пассива */}
              {!showForm && (
                <tr className="asset-add-row" style={{ cursor: 'pointer' }} onClick={handleAddClick}>
                  <td colSpan={11} style={{ textAlign: 'center', color: '#888' }}>+ Добавить пассив</td>
                </tr>
              )}
              {showForm && !editLiability && (
                <tr className="asset-form-row">
                  <td><input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Название" /></td>
                  <td>
                    <select value={formType} onChange={e => setFormType(Number(e.target.value))}>
                      {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" value={formInitialAmount} onChange={e => setFormInitialAmount(e.target.value)} placeholder="Сумма" /></td>
                  <td>
                    <select value={formCurrency} onChange={e => setFormCurrency(Number(e.target.value))}>
                      {currencies.map(cur => <option key={cur.id} value={cur.id}>{cur.symbol || cur.code}</option>)}
                    </select>
                  </td>
                  <td><input type="date" value={formOpenDate} onChange={e => setFormOpenDate(e.target.value)} /></td>
                  <td><input type="date" value={formCloseDate} onChange={e => setFormCloseDate(e.target.value)} /></td>
                  <td><input type="number" value={formInterestRate} onChange={e => setFormInterestRate(e.target.value)} placeholder="%" /></td>
                  <td>
                    <select value={formPaymentType} onChange={e => setFormPaymentType(e.target.value)}>
                      <option value="">—</option>
                      <option value="annuity">Аннуитетный</option>
                      <option value="diff">Дифференцированный</option>
                    </select>
                  </td>
                  <td><input type="date" value={formPaymentDate} onChange={e => setFormPaymentDate(e.target.value)} /></td>
                  <td><input type="checkbox" checked={formIsFamily} onChange={e => setFormIsFamily(e.target.checked)} /></td>
                  <td>
                    <button className="icon-btn" title="Сохранить" onClick={handleFormSubmit}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-8" stroke="#388e3c" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                    <button className="icon-btn" title="Отмена" onClick={handleEditCancel}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </td>
                </tr>
              )}
              {liabilities.map(liability =>
                editLiability && editLiability.id === liability.id ? (
                  <tr key={liability.id} className="asset-edit-row">
                    <td><input type="text" value={formName} onChange={e => setFormName(e.target.value)} /></td>
                    <td>
                      <select value={formType} onChange={e => setFormType(Number(e.target.value))}>
                        {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                      </select>
                    </td>
                    <td><input type="number" value={formInitialAmount} onChange={e => setFormInitialAmount(e.target.value)} /></td>
                    <td>
                      <select value={formCurrency} onChange={e => setFormCurrency(Number(e.target.value))}>
                        {currencies.map(cur => <option key={cur.id} value={cur.id}>{cur.symbol || cur.code}</option>)}
                      </select>
                    </td>
                    <td><input type="date" value={formOpenDate} onChange={e => setFormOpenDate(e.target.value)} /></td>
                    <td><input type="date" value={formCloseDate} onChange={e => setFormCloseDate(e.target.value)} /></td>
                    <td><input type="number" value={formInterestRate} onChange={e => setFormInterestRate(e.target.value)} /></td>
                    <td>
                      <select value={formPaymentType} onChange={e => setFormPaymentType(e.target.value)}>
                        <option value="">—</option>
                        <option value="annuity">Аннуитетный</option>
                        <option value="diff">Дифференцированный</option>
                      </select>
                    </td>
                    <td><input type="date" value={formPaymentDate} onChange={e => setFormPaymentDate(e.target.value)} /></td>
                    <td><input type="checkbox" checked={formIsFamily} onChange={e => setFormIsFamily(e.target.checked)} /></td>
                    <td>
                      <button className="icon-btn" title="Сохранить" onClick={handleFormSubmit}>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-8" stroke="#388e3c" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                      <button className="icon-btn" title="Отмена" onClick={handleEditCancel}>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </td>
                  </tr>
                ) :
                  <tr key={liability.id}>
                    <td>{liability.name}</td>
                    <td>{typeof liability.type === 'object' ? liability.type.name : (types.find(t => t.id === liability.type)?.name || liability.type)}</td>
                    <td>{liability.initial_amount}</td>
                    <td>{typeof liability.currency === 'object' && liability.currency !== null ? (liability.currency.symbol || liability.currency.code) : getCurrency(liability.currency as number)}</td>
                    <td>{liability.open_date ? new Date(liability.open_date).toLocaleDateString('ru-RU') : '-'}</td>
                    <td>{liability.close_date ? new Date(liability.close_date).toLocaleDateString('ru-RU') : '-'}</td>
                    <td>{liability.interest_rate ?? '-'}</td>
                    <td>{liability.payment_type === 'annuity' ? 'Аннуитетный' : liability.payment_type === 'diff' ? 'Дифференцированный' : '-'}</td>
                    <td>{liability.payment_date ? new Date(liability.payment_date).toLocaleDateString('ru-RU') : '-'}</td>
                    <td>{liability.is_family ? 'Да' : 'Нет'}</td>
                    <td className="actions">
                      <button className="icon-btn" title="Редактировать" onClick={() => handleEditClick(liability)}>
                        <MdEdit />
                      </button>
                      <button className="icon-btn danger" title="Удалить" onClick={() => handleDeleteClick(liability.id)}>
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
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
        .assets-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: #fff;
          box-shadow: 0 2px 8px #0001;
          border-radius: 12px;
          overflow: hidden;
        }
        .assets-table thead tr {
          background: #f7f7fa;
          border-bottom: 2px solid #e0e0e0;
        }
        .assets-table th {
          padding: 14px 12px;
          font-weight: 600;
          font-size: 15px;
          color: #333;
          text-align: left;
        }
        .assets-table tbody tr {
          border-bottom: 1px solid #ececec;
          transition: background 0.18s;
        }
        .assets-table tbody tr:last-child {
          border-bottom: none;
        }
        .assets-table td {
          padding: 12px 12px;
          font-size: 15px;
          color: #222;
        }
        .assets-table td.actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .assets-table tbody tr:hover {
          background: #f0f4ff;
        }
        .asset-add-row {
          background: #f7fafc;
          border-bottom: 2px solid #b3c0d1;
          border-top: 2px solid #b3c0d1;
          box-shadow: 0 2px 6px 0 rgba(44, 62, 80, 0.04);
          font-weight: 500;
          transition: background 0.2s;
        }
        .asset-add-row input,
        .asset-add-row select {
          background: #fff;
          border: 1px solid #cfd8e3;
          border-radius: 4px;
          padding: 4px 8px;
        }
      `}</style>
    </div>
  );
};

export default LiabilitiesPage; 