const API_BASE = '/api/deposit-receipt';

export async function getAllDeposits() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Fetch error');
  const { data } = await res.json();
  return data;
}

export async function createDeposit(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Create failed');
  }
  return (await res.json()).data;
}

export async function updateDeposit(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Update failed');
  return (await res.json()).data;
}

export async function deleteDeposit(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Delete failed');
  return (await res.json()).data;
}
