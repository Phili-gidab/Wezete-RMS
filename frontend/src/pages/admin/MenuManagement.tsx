import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  useCategories,
  useMenuItems,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from '../../api/hooks';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  menuItems: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  prepTime?: number;
  categoryId: string;
  category: { id: string; name: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatETB(amount: number) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Category Modal ───────────────────────────────────────────────────────────

interface CategoryModalProps {
  category?: Category | null;
  onClose: () => void;
}

function CategoryModal({ category, onClose }: CategoryModalProps) {
  const isEdit = !!category;
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [name, setName] = useState(category?.name ?? '');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState<string>(
    category?.sortOrder !== undefined ? String(category.sortOrder) : ''
  );

  const isPending = createCategory.isPending || updateCategory.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const payload: { name: string; imageUrl?: string; sortOrder?: number } = {
      name: name.trim(),
    };
    if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();
    if (sortOrder !== '') payload.sortOrder = Number(sortOrder);

    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({ id: category.id, ...payload });
        toast.success('Category updated');
      } else {
        await createCategory.mutateAsync(payload);
        toast.success('Category created');
      }
      onClose();
    } catch {
      toast.error('Failed to save category');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-forest">
            {isEdit ? 'Edit Category' : 'New Category'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Course"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white transition disabled:opacity-60"
              style={{ backgroundColor: '#0A3D39' }}
            >
              {isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Menu Item Modal ──────────────────────────────────────────────────────────

interface MenuItemModalProps {
  item?: MenuItem | null;
  categories: Category[];
  onClose: () => void;
}

function MenuItemModal({ item, categories, onClose }: MenuItemModalProps) {
  const isEdit = !!item;
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();

  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState<string>(item?.price !== undefined ? String(item.price) : '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? (categories[0]?.id ?? ''));
  const [prepTime, setPrepTime] = useState<string>(
    item?.prepTime !== undefined ? String(item.prepTime) : ''
  );
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');

  const isPending = createMenuItem.isPending || updateMenuItem.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !categoryId) return;

    const payload: {
      name: string;
      price: number;
      categoryId: string;
      description?: string;
      imageUrl?: string;
      prepTime?: number;
    } = {
      name: name.trim(),
      price: parseFloat(price),
      categoryId,
    };
    if (description.trim()) payload.description = description.trim();
    if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();
    if (prepTime !== '') payload.prepTime = Number(prepTime);

    try {
      if (isEdit && item) {
        await updateMenuItem.mutateAsync({ id: item.id, ...payload });
        toast.success('Menu item updated');
      } else {
        await createMenuItem.mutateAsync(payload);
        toast.success('Menu item created');
      }
      onClose();
    } catch {
      toast.error('Failed to save menu item');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-forest">
            {isEdit ? 'Edit Menu Item' : 'New Menu Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tibs Special"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Price (ETB) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition bg-white"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prep Time (min)
              </label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="e.g. 15"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the dish…"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white transition disabled:opacity-60"
              style={{ backgroundColor: '#0A3D39' }}
            >
              {isPending ? 'Saving…' : isEdit ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function DeleteConfirm({ label, onConfirm, onCancel, isPending }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Delete {label}?</h3>
            <p className="mt-1 text-sm text-slate-500">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MenuManagement() {
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: menuItems = [], isLoading: loadingItems } = useMenuItems();

  const deleteCategory = useDeleteCategory();
  const deleteMenuItem = useDeleteMenuItem();
  const updateMenuItem = useUpdateMenuItem();

  // Category modal
  const [catModal, setCatModal] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  });

  // Menu item modal
  const [itemModal, setItemModal] = useState<{ open: boolean; item: MenuItem | null }>({
    open: false,
    item: null,
  });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'category'; id: string; name: string }
    | { type: 'item'; id: string; name: string }
    | null
  >(null);

  // Filters
  const [search, setSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  const filteredItems = useMemo(() => {
    let list: MenuItem[] = menuItems;

    if (activeCategoryFilter !== 'all') {
      list = list.filter((item) => item.categoryId === activeCategoryFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.category?.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [menuItems, activeCategoryFilter, search]);

  // Toggle availability
  async function toggleAvailability(item: MenuItem) {
    try {
      await updateMenuItem.mutateAsync({ id: item.id, isAvailable: !item.isAvailable });
      toast.success(`${item.name} marked as ${!item.isAvailable ? 'available' : 'unavailable'}`);
    } catch {
      toast.error('Failed to update availability');
    }
  }

  // Confirm delete
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'category') {
        await deleteCategory.mutateAsync(deleteTarget.id);
        toast.success('Category deleted');
      } else {
        await deleteMenuItem.mutateAsync(deleteTarget.id);
        toast.success('Menu item deleted');
      }
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete');
    }
  }

  const isDeletePending = deleteCategory.isPending || deleteMenuItem.isPending;

  // Loading skeleton
  if (loadingCats && loadingItems) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 rounded-xl" />
          <div className="xl:col-span-2 h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest">Menu Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your categories and menu items
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Categories Panel ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-forest">Categories</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {categories.length} total
              </p>
            </div>
            <button
              onClick={() => setCatModal({ open: true, category: null })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: '#0A3D39' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>

          {loadingCats ? (
            <div className="flex-1 p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No categories yet.</p>
              <p className="text-xs text-slate-400 mt-0.5">Click "Add" to create one.</p>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[480px]">
              {categories.map((cat: Category) => {
                const itemCount = cat.menuItems?.length ?? 0;
                return (
                  <li
                    key={cat.id}
                    className={`flex items-center gap-3 px-5 py-3.5 group hover:bg-slate-50 transition cursor-pointer ${
                      activeCategoryFilter === cat.id ? 'bg-[#0A3D39]/5' : ''
                    }`}
                    onClick={() =>
                      setActiveCategoryFilter((prev) => (prev === cat.id ? 'all' : cat.id))
                    }
                  >
                    {/* Color dot */}
                    <span
                      className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: cat.isActive ? '#0A3D39' : '#cbd5e1',
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{cat.name}</p>
                      <p className="text-xs text-slate-400">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatModal({ open: true, category: cat });
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-forest hover:bg-forest/10 transition"
                        title="Edit category"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'category', id: cat.id, name: cat.name });
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete category"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Menu Items Panel ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-forest">Menu Items</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredItems.length} of {menuItems.length} items
                  {activeCategoryFilter !== 'all' && (
                    <button
                      onClick={() => setActiveCategoryFilter('all')}
                      className="ml-2 text-forest underline underline-offset-2 hover:no-underline"
                    >
                      clear filter
                    </button>
                  )}
                </p>
              </div>
              <button
                onClick={() => setItemModal({ open: true, item: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: '#0A3D39' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>

            {/* Search + category filter pills */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.65 4.65a7.5 7.5 0 0012 12z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest transition"
                />
              </div>

              {/* Category filter pills row */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-shrink-0">
                <button
                  onClick={() => setActiveCategoryFilter('all')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeCategoryFilter === 'all'
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={activeCategoryFilter === 'all' ? { backgroundColor: '#0A3D39' } : {}}
                >
                  All
                </button>
                {categories.map((cat: Category) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeCategoryFilter === cat.id
                        ? 'text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    style={activeCategoryFilter === cat.id ? { backgroundColor: '#0A3D39' } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {loadingItems ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">
                  {search || activeCategoryFilter !== 'all'
                    ? 'No items match your filters.'
                    : 'No menu items yet.'}
                </p>
                {!search && activeCategoryFilter === 'all' && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click "Add Item" to get started.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item: MenuItem) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {/* Image or placeholder */}
                    <div className="relative h-32 bg-slate-100 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Availability badge */}
                      <div className="absolute top-2 right-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.isAvailable
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-1">
                          {item.name}
                        </h3>
                        <span className="flex-shrink-0 text-sm font-bold text-forest">
                          {formatETB(item.price)}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {item.category?.name ?? '—'}
                        </span>
                        {item.prepTime !== undefined && item.prepTime !== null && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {item.prepTime} min
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Toggle availability */}
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                            item.isAvailable
                              ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          disabled={updateMenuItem.isPending}
                        >
                          {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                        </button>

                        <button
                          onClick={() => setItemModal({ open: true, item })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-forest hover:bg-forest/10 transition"
                          title="Edit item"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          onClick={() =>
                            setDeleteTarget({ type: 'item', id: item.id, name: item.name })
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete item"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}

      {catModal.open && (
        <CategoryModal
          category={catModal.category}
          onClose={() => setCatModal({ open: false, category: null })}
        />
      )}

      {itemModal.open && (
        <MenuItemModal
          item={itemModal.item}
          categories={categories}
          onClose={() => setItemModal({ open: false, item: null })}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          label={`"${deleteTarget.name}"`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isPending={isDeletePending}
        />
      )}
    </>
  );
}
