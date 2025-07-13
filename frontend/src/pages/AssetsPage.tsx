import React, { useState, useEffect } from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Asset {
  id: number;
  name: string;
  type: number | AssetType;
  purchase_value: number;
  purchase_currency: number | Currency;
  current_value: number;
  current_currency: number | Currency;
  [key: string]: any;
}

interface AssetType {
  id: number;
  name: string;
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

const API_URL = 'http://localhost:8000/api/finance/assets/';
const TYPES_URL = 'http://localhost:8000/api/finance/asset-types/';
const CURRENCIES_URL = 'http://localhost:8000/api/finance/currencies/';
const CATEGORIES_URL = 'http://localhost:8000/api/finance/categories/';
const ASSET_HISTORY_URL = 'http://localhost:8000/api/finance/asset-value-history/';

const PERIODS = [
  { label: 'Месяц', value: 'month' },
  { label: 'Полгода', value: 'halfyear' },
  { label: 'Год', value: 'year' },
  { label: '5 лет', value: '5years' },
];

const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<number | ''>('');
  const [formPurchaseValue, setFormPurchaseValue] = useState('');
  const [formPurchaseCurrency, setFormPurchaseCurrency] = useState<number | ''>('');
  const [formCurrentValue, setFormCurrentValue] = useState('');
  const [formCurrentCurrency, setFormCurrentCurrency] = useState<number | ''>('');
  const [formCategory, setFormCategory] = useState<number | ''>('');
  const [formIsFamily, setFormIsFamily] = useState(false);
  const [formLastValuationDate, setFormLastValuationDate] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Суммарная стоимость всех активов (по текущей стоимости)
  const totalValue = assets.reduce((sum, asset) => sum + (Number(asset.current_value) || 0), 0);
  // Валюта по умолчанию (берём первую, если есть)
  const defaultCurrency = currencies[0]?.code || '';

  const getCurrency = (id: number) => {
    const cur = currencies.find(c => c.id === id);
    return cur ? (cur.symbol || cur.code) : '';
  };

  // Загрузка справочников
  const fetchDictionaries = async () => {
    try {
      const token = localStorage.getItem('token');
      const [typesResp, currResp, catResp] = await Promise.all([
        fetch(TYPES_URL, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(CURRENCIES_URL, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(CATEGORIES_URL, { headers: { 'Authorization': `Token ${token}` } })
      ]);
      if (!typesResp.ok || !currResp.ok || !catResp.ok) throw new Error('Ошибка загрузки справочников');
      setTypes(await typesResp.json());
      setCurrencies(await currResp.json());
      setCategories(await catResp.json());
    } catch (e: any) {
      setError(e.message || 'Ошибка справочников');
    }
  };

  // Загрузка активов с backend
  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(API_URL, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!resp.ok) throw new Error('Ошибка загрузки активов');
      const data = await resp.json();
      setAssets(data);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка истории стоимости активов
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch(ASSET_HISTORY_URL, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (!resp.ok) throw new Error('Ошибка загрузки истории активов');
        const data = await resp.json();
        // Агрегируем по дате: сумма value по всем активам
        const dateMap: Record<string, number> = {};
        data.forEach((item: any) => {
          if (!dateMap[item.date]) dateMap[item.date] = 0;
          dateMap[item.date] += Number(item.value);
        });
        // Преобразуем в массив для графика, сортируем по дате
        const chartData = Object.entries(dateMap)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setHistoryData(chartData);
      } catch (e) {
        setHistoryData([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  // Фильтрация данных по периоду
  const getFilteredHistory = () => {
    if (!historyData.length) return [];
    const now = new Date();
    let fromDate: Date;
    switch (selectedPeriod) {
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'halfyear':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case 'year':
        fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '5years':
        fromDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        break;
      default:
        fromDate = new Date(0);
    }
    return historyData.filter(item => new Date(item.date) >= fromDate);
  };

  // Автоматический диапазон для оси Y
  const getYDomain = (data: any[]) => {
    if (!data.length) return [0, 1];
    let min = Math.min(...data.map(d => d.value));
    let max = Math.max(...data.map(d => d.value));
    if (min === max) {
      // Если все значения одинаковые, делаем небольшой диапазон
      min = min - 1;
      max = max + 1;
    }
    return [Math.floor(min), Math.ceil(max)];
  };

  useEffect(() => {
    const main = document.querySelector('.main-content');
    if (main) main.classList.add('assets-page');
    fetchDictionaries();
    fetchAssets();
    return () => { if (main) main.classList.remove('assets-page'); };
  }, []);

  const handleAddClick = () => {
    setEditAsset(null);
    setFormName('');
    setFormType(types.length > 0 ? types[0].id : '');
    setFormCategory('');
    setFormPurchaseValue('');
    setFormPurchaseCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormCurrentValue('');
    setFormCurrentCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormIsFamily(false);
    setFormLastValuationDate('');
    setError(null);
    setShowForm(true);
  };

  const handleEditClick = (asset: Asset) => {
    setEditAsset(asset);
    setFormName(asset.name);
    setFormType(typeof asset.type === 'object' ? asset.type.id : asset.type);
    setFormPurchaseValue(asset.purchase_value?.toString() || '');
    setFormPurchaseCurrency(typeof asset.purchase_currency === 'object' ? asset.purchase_currency.id : asset.purchase_currency);
    setFormCurrentValue(asset.current_value?.toString() || '');
    setFormCurrentCurrency(typeof asset.current_currency === 'object' ? asset.current_currency.id : asset.current_currency);
    setFormIsFamily(asset.is_family || false);
    setFormLastValuationDate(asset.last_valuation_date || '');
    setFormCategory(typeof asset.category === 'object' ? asset.category.id : asset.category || '');
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
      setAssets(assets.filter(a => a.id !== id));
    } catch (e: any) {
      setError(e.message || 'Ошибка удаления');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formName.trim() || isNaN(Number(formPurchaseValue)) || isNaN(Number(formCurrentValue))) return;
    const token = localStorage.getItem('token');
    const body = {
      name: formName,
      type: formType,
      category: formCategory || null,
      purchase_value: Number(formPurchaseValue),
      purchase_currency: formPurchaseCurrency,
      current_value: Number(formCurrentValue),
      current_currency: formCurrentCurrency,
      is_family: formIsFamily,
      last_valuation_date: formLastValuationDate,
    };
    try {
      if (editAsset) {
        const resp = await fetch(`${API_URL}${editAsset.id}/`, {
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
        setAssets(assets.map(a => a.id === editAsset.id ? updated : a));
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
        setAssets([...assets, created]);
      }
      setShowForm(false);
      setEditAsset(null);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    }
  };

  // --- Handlers for creating new values ---
  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    const token = localStorage.getItem('token');
    const resp = await fetch(TYPES_URL, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTypeName })
    });
    if (resp.ok) {
      await fetchDictionaries();
      const typesResp = await fetch(TYPES_URL, { headers: { 'Authorization': `Token ${token}` } });
      const typesList = await typesResp.json();
      const created = typesList.find((t: any) => t.name === newTypeName);
      setFormType(created?.id || '');
      setShowTypeModal(false);
      setNewTypeName('');
    }
  };
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const token = localStorage.getItem('token');
    const resp = await fetch(CATEGORIES_URL, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName, type: 'asset' })
    });
    if (resp.ok) {
      await fetchDictionaries();
      const catResp = await fetch(CATEGORIES_URL, { headers: { 'Authorization': `Token ${token}` } });
      const catList = await catResp.json();
      const created = catList.find((c: any) => c.name === newCategoryName);
      setFormCategory(created?.id || '');
      setShowCategoryModal(false);
      setNewCategoryName('');
    }
  };
  const handleCreateCurrency = async () => {
    if (!newCurrencyCode.trim() || !newCurrencyName.trim()) return;
    const token = localStorage.getItem('token');
    const resp = await fetch(CURRENCIES_URL, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCurrencyCode, name: newCurrencyName, symbol: newCurrencySymbol })
    });
    if (resp.ok) {
      await fetchDictionaries();
      const currResp = await fetch(CURRENCIES_URL, { headers: { 'Authorization': `Token ${token}` } });
      const currList = await currResp.json();
      const created = currList.find((c: any) => c.code === newCurrencyCode);
      setFormPurchaseCurrency(created?.id || '');
      setFormCurrentCurrency(created?.id || '');
      setShowCurrencyModal(false);
      setNewCurrencyCode('');
      setNewCurrencyName('');
      setNewCurrencySymbol('');
    }
  };

  const openTypeModal = () => {
    setShowTypeModal(true);
  };

  const openCategoryModal = () => {
    setShowCategoryModal(true);
  };

  const openCurrencyModal = () => {
    setShowCurrencyModal(true);
  };

  // Функция для отмены редактирования актива
  const handleEditCancel = () => {
    setEditAsset(null);
    setShowForm(false);
    setFormName('');
    setFormType(types.length > 0 ? types[0].id : '');
    setFormCategory('');
    setFormPurchaseValue('');
    setFormPurchaseCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormCurrentValue('');
    setFormCurrentCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormIsFamily(false);
    setFormLastValuationDate('');
    setError(null);
  };

  return (
    <div>
      <h2>Мои Активы</h2>
      <div className="dashboard-row">
        <div className="dashboard-card total-value">
          <div className="dashboard-title">Суммарная стоимость</div>
          <div className="dashboard-value">
            {totalValue.toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 })}
            {defaultCurrency && <span className="dashboard-currency"> {defaultCurrency}</span>}
          </div>
        </div>
        <div className="dashboard-card chart-card">
          <div className="dashboard-title" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Динамика стоимости</span>
            <button className="expand-btn" title="Увеличить график" onClick={() => setChartModalOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="3" fill="none" stroke="#2a3b6d" strokeWidth="2"/><path d="M7 3v2a2 2 0 0 1-2 2H3" stroke="#2a3b6d" strokeWidth="2" fill="none"/></svg>
            </button>
          </div>
          <div className="chart-row" style={{height: '60px'}}>
            <div className="dashboard-chart-placeholder" style={{ flex: 1, height: '100%' }}>
              {loadingHistory ? (
                <span style={{ color: '#bbb', fontSize: 13 }}>Загрузка...</span>
              ) : getFilteredHistory().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getFilteredHistory()} margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={getYDomain(getFilteredHistory())} hide />
                    <Tooltip formatter={v => Number(v).toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 })} labelFormatter={d => `Дата: ${d}`} />
                    <Line type="monotone" dataKey="value" stroke="#2a3b6d" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <span style={{ color: '#bbb', fontSize: 13 }}>Нет данных</span>
              )}
            </div>
            <div className="dashboard-periods vertical align-left">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  className={selectedPeriod === p.value ? 'period-btn active' : 'period-btn'}
                  onClick={() => setSelectedPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        {loading ? (
          <div className="assets-list-placeholder">Загрузка...</div>
        ) : assets.length === 0 ? (
          <div className="assets-list-placeholder">
            <p>У вас пока нет активов.</p>
          </div>
        ) : (
          <table className="assets-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Категория</th>
                <th>Стоимость покупки</th>
                <th>Текущая стоимость</th>
                <th>Дата последней оценки</th>
                <th>Семейный</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* Строка добавления нового актива */}
              {!showForm && (
                <tr className="asset-add-row" style={{ cursor: 'pointer' }} onClick={handleAddClick}>
                  <td colSpan={9} style={{ textAlign: 'center', color: '#888' }}>+ Добавить актив</td>
                </tr>
              )}
              {showForm && !editAsset && (
                <>
                  {error && (
                    <tr className="asset-form-error-row">
                      <td colSpan={9}>
                        <div className="error" style={{ marginBottom: 8 }}>{error}</div>
                      </td>
                    </tr>
                  )}
                  <tr className="asset-form-row">
                    <td><input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Название" /></td>
                    <td>
                      <select value={formType} onChange={e => {
                        if (e.target.value === 'new') { openTypeModal(); return; }
                        setFormType(e.target.value === '' ? '' : Number(e.target.value));
                      }}>
                        {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                        <option value="new">Создать новую…</option>
                      </select>
                    </td>
                    <td>
                      <select value={formCategory} onChange={e => {
                        if (e.target.value === 'new') { openCategoryModal(); return; }
                        setFormCategory(e.target.value === '' ? '' : Number(e.target.value));
                      }}>
                        <option value="">—</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        <option value="new">Создать новую…</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <input type="number" value={formPurchaseValue} onChange={e => setFormPurchaseValue(e.target.value)} placeholder="Стоимость" style={{ width: 90 }} />
                        <select value={formPurchaseCurrency} onChange={e => {
                          if (e.target.value === 'new') { openCurrencyModal(); return; }
                          setFormPurchaseCurrency(e.target.value === '' ? '' : Number(e.target.value));
                        }} style={{ width: 60 }}>
                          {currencies.map(cur => <option key={cur.id} value={cur.id}>{cur.code}</option>)}
                          <option value="new">Создать новую…</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <input type="number" value={formCurrentValue} onChange={e => setFormCurrentValue(e.target.value)} placeholder="Текущая стоимость" style={{ width: 90 }} />
                        <select value={formCurrentCurrency} onChange={e => {
                          if (e.target.value === 'new') { openCurrencyModal(); return; }
                          setFormCurrentCurrency(e.target.value === '' ? '' : Number(e.target.value));
                        }} style={{ width: 60 }}>
                          {currencies.map(cur => <option key={cur.id} value={cur.id}>{cur.code}</option>)}
                          <option value="new">Создать новую…</option>
                        </select>
                      </div>
                    </td>
                    <td><input type="date" value={formLastValuationDate} onChange={e => { setFormLastValuationDate(e.target.value); setError(null); }} /></td>
                    <td>
                      <input type="checkbox" checked={formIsFamily} onChange={e => setFormIsFamily(e.target.checked)} />
                    </td>
                    <td colSpan={2} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <button className="icon-btn" title="Добавить" onClick={handleAddClick}>
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#2a3b6d" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                        <button className="icon-btn" title="Отмена" onClick={() => setShowForm(false)}>
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </>
              )}
              {assets.map(asset =>
                editAsset && editAsset.id === asset.id ? (
                  <>
                    {error && (
                      <tr className="asset-form-error-row">
                        <td colSpan={9}>
                          <div className="error" style={{ marginBottom: 8 }}>{error}</div>
                        </td>
                      </tr>
                    )}
                    <tr key={asset.id} className="asset-edit-row">
                      <td><input type="text" value={formName} onChange={e => setFormName(e.target.value)} /></td>
                      <td>
                        <select value={formType} onChange={e => {
                          if (e.target.value === 'new') { openTypeModal(); return; }
                          setFormType(e.target.value === '' ? '' : Number(e.target.value));
                        }}>
                          {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                          <option value="new">Создать новую…</option>
                        </select>
                      </td>
                      <td>
                        <select value={formCategory} onChange={e => {
                          if (e.target.value === 'new') { openCategoryModal(); return; }
                          setFormCategory(e.target.value === '' ? '' : Number(e.target.value));
                        }}>
                          <option value="">—</option>
                          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          <option value="new">Создать новую…</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <input type="number" value={formPurchaseValue} onChange={e => setFormPurchaseValue(e.target.value)} style={{ width: 90 }} />
                          <select value={formPurchaseCurrency} onChange={e => {
                            if (e.target.value === 'new') { openCurrencyModal(); return; }
                            setFormPurchaseCurrency(e.target.value === '' ? '' : Number(e.target.value));
                          }} style={{ width: 60 }}>
                            {currencies.map(cur => <option key={cur.id} value={cur.id}>{cur.code}</option>)}
                            <option value="new">Создать новую…</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <input type="number" value={formCurrentValue} onChange={e => setFormCurrentValue(e.target.value)} style={{ width: 90 }} />
                          <select value={formCurrentCurrency} onChange={e => {
                            if (e.target.value === 'new') { openCurrencyModal(); return; }
                            setFormCurrentCurrency(e.target.value === '' ? '' : Number(e.target.value));
                          }} style={{ width: 60 }}>
                            {currencies.map(cur => <option key={cur.id} value={cur.id}>{cur.code}</option>)}
                            <option value="new">Создать новую…</option>
                          </select>
                        </div>
                      </td>
                      <td><input type="date" value={formLastValuationDate} onChange={e => { setFormLastValuationDate(e.target.value); setError(null); }} /></td>
                      <td>
                        <input type="checkbox" checked={formIsFamily} onChange={e => setFormIsFamily(e.target.checked)} />
                      </td>
                      <td colSpan={2} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                          <button className="icon-btn" title="Сохранить" onClick={handleFormSubmit}>
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-8" stroke="#388e3c" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                          <button className="icon-btn" title="Отмена" onClick={handleEditCancel}>
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr key={asset.id}>
                    <td>{asset.name}</td>
                    <td>{typeof asset.type === 'object' ? asset.type.name : (types.find(t => t.id === asset.type)?.name || asset.type)}</td>
                    <td>{typeof asset.category === 'object' ? asset.category.name : (categories.find(c => c.id === asset.category)?.name || asset.category)}</td>
                    <td>{(typeof asset.purchase_value === 'number' && !isNaN(asset.purchase_value)
                      ? asset.purchase_value.toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 })
                      : (Number(asset.purchase_value) ? Number(asset.purchase_value).toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }) : '0.00'))}
                      {' '}
                      {typeof asset.purchase_currency === 'object' && asset.purchase_currency !== null ? (asset.purchase_currency.symbol || asset.purchase_currency.code) : getCurrency(asset.purchase_currency as number)}
                    </td>
                    <td>{(typeof asset.current_value === 'number' && !isNaN(asset.current_value)
                      ? asset.current_value.toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 })
                      : (Number(asset.current_value) ? Number(asset.current_value).toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }) : '0.00'))}
                      {' '}
                      {typeof asset.current_currency === 'object' && asset.current_currency !== null ? (asset.current_currency.symbol || asset.current_currency.code) : getCurrency(asset.current_currency as number)}
                    </td>
                    <td>{asset.last_valuation_date ? new Date(asset.last_valuation_date).toLocaleDateString('ru-RU') : '-'}</td>
                    <td>{asset.is_family ? 'Да' : 'Нет'}</td>
                    <td className="actions">
                      <button className="icon-btn" title="Редактировать" onClick={() => handleEditClick(asset)}>
                        <MdEdit />
                      </button>
                      <button className="icon-btn danger" title="Удалить" onClick={() => handleDeleteClick(asset.id)}>
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
      {/* --- Модальные окна --- */}
      {showTypeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Создать новый тип актива</h3>
            <input
              type="text"
              placeholder="Название типа"
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              style={{ width: 200, marginBottom: 12 }}
            />
            <div style={{ marginTop: 12 }}>
              <button className="primary-btn" onClick={handleCreateType} disabled={!newTypeName.trim()}>Создать</button>
              <button className="icon-btn" onClick={() => setShowTypeModal(false)} style={{ marginLeft: 8 }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Создать новую категорию</h3>
            <input
              type="text"
              placeholder="Название категории"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              style={{ width: 200, marginBottom: 12 }}
            />
            <div style={{ marginTop: 12 }}>
              <button className="primary-btn" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>Создать</button>
              <button className="icon-btn" onClick={() => setShowCategoryModal(false)} style={{ marginLeft: 8 }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {showCurrencyModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Создать новую валюту</h3>
            <input
              type="text"
              placeholder="Код валюты (например, RUB)"
              value={newCurrencyCode}
              onChange={e => setNewCurrencyCode(e.target.value)}
              style={{ width: 120, marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="Название валюты (например, Российский рубль)"
              value={newCurrencyName}
              onChange={e => setNewCurrencyName(e.target.value)}
              style={{ width: 200, marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="Символ (₽, $, € и т.д.)"
              value={newCurrencySymbol}
              onChange={e => setNewCurrencySymbol(e.target.value)}
              style={{ width: 80, marginBottom: 8 }}
            />
            <div style={{ marginTop: 12 }}>
              <button className="primary-btn" onClick={handleCreateCurrency} disabled={!newCurrencyCode.trim() || !newCurrencyName.trim()}>Создать</button>
              <button className="icon-btn" onClick={() => setShowCurrencyModal(false)} style={{ marginLeft: 8 }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {chartModalOpen && (
        <div className="modal-overlay chart-modal" onClick={() => setChartModalOpen(false)}>
          <div className="modal chart-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 18 }}>Динамика стоимости</span>
              <button className="close-btn" onClick={() => setChartModalOpen(false)} title="Закрыть">×</button>
            </div>
            <div className="dashboard-periods horizontal align-left" style={{ marginBottom: 12 }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  className={selectedPeriod === p.value ? 'period-btn active' : 'period-btn'}
                  onClick={() => setSelectedPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="chart-row" style={{ marginBottom: 18, height: 320 }}>
              <div className="dashboard-chart-placeholder" style={{ flex: 1, height: 300 }}>
                {loadingHistory ? (
                  <span style={{ color: '#bbb', fontSize: 18 }}>Загрузка...</span>
                ) : getFilteredHistory().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getFilteredHistory()} margin={{ top: 20, right: 32, left: 32, bottom: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 13 }} height={32} interval="preserveEnd" minTickGap={16} />
                      <YAxis tick={{ fontSize: 13 }} width={60} domain={getYDomain(getFilteredHistory())} />
                      <Tooltip formatter={v => Number(v).toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 })} labelFormatter={d => `Дата: ${d}`} />
                      <Line type="monotone" dataKey="value" stroke="#2a3b6d" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <span style={{ color: '#bbb', fontSize: 18 }}>Нет данных</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- Стили для модалок --- */}
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
        .assets-table .add-asset-row td {
          background: #f5f5f5;
          color: #888;
          font-style: italic;
        }
        .assets-table .asset-form-row td {
          background: #f9f9fc;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.2);
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
        .dashboard-row {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }
        .dashboard-card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 1px 4px #0001;
          padding: 10px 14px 10px 14px;
          min-width: 110px;
          max-width: 150px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .dashboard-card.total-value {
          flex: 0 0 150px;
          max-width: 150px;
        }
        .dashboard-card.chart-card {
          flex: 0 0 220px;
          max-width: 220px;
          min-width: 180px;
        }
        .dashboard-title {
          font-size: 12px;
          color: #888;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .dashboard-value {
          font-size: 1.05rem;
          font-weight: 700;
          color: #2a3b6d;
          margin-bottom: 1px;
        }
        .dashboard-currency {
          font-size: 0.85rem;
          color: #888;
          margin-left: 4px;
        }
        .dashboard-periods {
          display: flex;
          gap: 4px;
          margin-bottom: 6px;
        }
        .period-btn {
          background: #f5f7fa;
          border: none;
          border-radius: 5px;
          padding: 1px 7px 1px 7px;
          font-size: 12px;
          color: #2a3b6d;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.18s, color 0.18s;
          line-height: 1.1;
        }
        .period-btn.active, .period-btn:hover {
          background: #e0e7ff;
          color: #1a237e;
        }
        .dashboard-chart-placeholder {
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f8fa;
          border-radius: 6px;
          margin-top: 4px;
        }
        .expand-btn {
          background: none;
          border: none;
          padding: 0;
          margin-left: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .expand-btn svg {
          display: block;
        }
        .modal-overlay.chart-modal {
          background: rgba(0,0,0,0.25);
          z-index: 2000;
        }
        .modal.chart-modal-content {
          min-width: 420px;
          min-height: 380px;
          max-width: 90vw;
          max-height: 90vh;
          padding: 32px 32px 24px 32px;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          color: #888;
          cursor: pointer;
          line-height: 1;
        }
        .chart-row {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          height: 100%;
        }
        .dashboard-periods {
          display: flex;
          gap: 4px;
          margin-bottom: 6px;
        }
        .dashboard-periods.vertical {
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          margin-bottom: 0;
        }
        .dashboard-periods.vertical.align-left {
          align-items: flex-start;
        }
        .dashboard-periods.horizontal {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
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

export default AssetsPage; 