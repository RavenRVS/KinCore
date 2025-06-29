import React, { useState, useEffect } from 'react';

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

const API_URL = '/api/finance/assets/';
const TYPES_URL = '/api/finance/asset-types/';
const CURRENCIES_URL = '/api/finance/currencies/';

const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
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
    setFormPurchaseValue('');
    setFormPurchaseCurrency(currencies.length > 0 ? currencies[0].id : '');
    setFormCurrentValue('');
    setFormCurrentCurrency(currencies.length > 0 ? currencies[0].id : '');
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
    setShowForm(true);
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
    if (!formName.trim() || isNaN(Number(formPurchaseValue)) || isNaN(Number(formCurrentValue))) return;
    const token = localStorage.getItem('token');
    const body = {
      name: formName,
      type: formType,
      purchase_value: Number(formPurchaseValue),
      purchase_currency: formPurchaseCurrency,
      current_value: Number(formCurrentValue),
      current_currency: formCurrentCurrency
    };
    try {
      if (editAsset) {
        // Редактирование
        const resp = await fetch(`${API_URL}${editAsset.id}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!resp.ok) throw new Error('Ошибка сохранения');
        const updated = await resp.json();
        setAssets(assets.map(a => a.id === editAsset.id ? updated : a));
      } else {
        // Добавление
        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!resp.ok) throw new Error('Ошибка добавления');
        const created = await resp.json();
        setAssets([...assets, created]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    }
  };

  return (
    <div>
      <h2>Мои Активы</h2>
      <button className="primary-btn" style={{ marginBottom: 24 }} onClick={handleAddClick}>Добавить актив</button>
      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
      {showForm && (
        <form className="asset-form" onSubmit={handleFormSubmit} style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Название актива"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            required
            style={{ marginRight: 12 }}
          />
          <select
            value={formType}
            onChange={e => setFormType(Number(e.target.value))}
            required
            style={{ marginRight: 12 }}
          >
            {types.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Стоимость покупки"
            value={formPurchaseValue}
            onChange={e => setFormPurchaseValue(e.target.value)}
            required
            min={0}
            step={0.01}
            style={{ marginRight: 12 }}
          />
          <select
            value={formPurchaseCurrency}
            onChange={e => setFormPurchaseCurrency(Number(e.target.value))}
            required
            style={{ marginRight: 12 }}
          >
            {currencies.map(cur => (
              <option key={cur.id} value={cur.id}>{cur.code} {cur.symbol}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Текущая стоимость"
            value={formCurrentValue}
            onChange={e => setFormCurrentValue(e.target.value)}
            required
            min={0}
            step={0.01}
            style={{ marginRight: 12 }}
          />
          <select
            value={formCurrentCurrency}
            onChange={e => setFormCurrentCurrency(Number(e.target.value))}
            required
            style={{ marginRight: 12 }}
          >
            {currencies.map(cur => (
              <option key={cur.id} value={cur.id}>{cur.code} {cur.symbol}</option>
            ))}
          </select>
          <button className="primary-btn" type="submit">{editAsset ? 'Сохранить' : 'Добавить'}</button>
          <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: 8 }}>Отмена</button>
        </form>
      )}
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
                <th>Текущая стоимость</th>
                <th>Валюта</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{typeof asset.type === 'object' ? asset.type.name : (types.find(t => t.id === asset.type)?.name || asset.type)}</td>
                  <td>{typeof asset.current_value === 'number' && !isNaN(asset.current_value)
                    ? asset.current_value.toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 })
                    : (Number(asset.current_value) ? Number(asset.current_value).toLocaleString('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }) : '0.00')
                  }</td>
                  <td>{typeof asset.current_currency === 'object' ? asset.current_currency.code : (currencies.find(c => c.id === asset.current_currency)?.code || asset.current_currency)}</td>
                  <td>
                    <button onClick={() => handleEditClick(asset)} style={{ marginRight: 8 }}>Редактировать</button>
                    <button onClick={() => handleDeleteClick(asset.id)} style={{ color: '#d32f2f' }}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AssetsPage; 