import { useState } from 'react';
import {
  useInventory,
  useLowStock,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from '../../api/hooks';
import toast from 'react-hot-toast';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  costPerUnit: number;
}

const emptyForm = {
  name: '',
  unit: '',
  quantity: 0,
  reorderLevel: 0,
  costPerUnit: 0,
};

export default function InventoryManagement() {
  const { data: items, isLoading } = useInventory();
  const { data: lowStockItems } = useLowStock();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      unit: item.unit,
      quantity: Number(item.quantity),
      reorderLevel: Number(item.reorderLevel),
      costPerUnit: Number(item.costPerUnit),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, ...form });
        toast.success('Item updated');
      } else {
        await createItem.mutateAsync(form);
        toast.success('Item created');
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteItem.mutateAsync(id);
      toast.success('Item deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const filteredItems = (items || []).filter((item: InventoryItem) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const lowStockIds = new Set((lowStockItems || []).map((i: any) => i.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#0A3D39]">Inventory Management</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90"
        >
          + Add Item
        </button>
      </div>

      {/* Low Stock Alert */}
      {(lowStockItems || []).length > 0 && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Low Stock Alert</h3>
          <p className="text-sm text-red-600">
            {(lowStockItems || []).map((i: any) => i.name).join(', ')} — below reorder level
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Quantity</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Reorder Level</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Cost/Unit (ETB)</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Stock Value</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item: InventoryItem) => {
                const isLow = lowStockIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={isLow ? 'bg-red-50' : 'hover:bg-slate-50'}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.name}
                      {isLow && (
                        <span className="ml-2 text-xs text-red-600 font-semibold">LOW</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-800">
                      {Number(item.quantity).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {Number(item.reorderLevel).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {Number(item.costPerUnit).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {(Number(item.quantity) * Number(item.costPerUnit)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-[#0A3D39] hover:underline text-sm mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <p className="p-8 text-center text-slate-500">No items found</p>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Item' : 'Add Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  required
                  placeholder="kg, litre, piece"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Lvl</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: +e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost/Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.costPerUnit}
                    onChange={(e) => setForm({ ...form, costPerUnit: +e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
