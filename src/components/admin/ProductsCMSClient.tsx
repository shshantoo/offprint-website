"use client";

import React, { useState, useEffect } from "react";
import { PrintProduct, PrintCategory } from "@/types/database";
import {
  fetchPrintProducts,
  savePrintProduct,
  deletePrintProduct,
} from "@/lib/data-service";
import {
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  X,
  Printer,
  Check,
} from "lucide-react";

export default function ProductsCMSClient() {
  const [products, setProducts] = useState<PrintProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PrintProduct | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PrintCategory>("cards");
  const [materialSpecs, setMaterialSpecs] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState("");
  const [minOrderQty, setMinOrderQty] = useState(50);
  const [isTrending, setIsTrending] = useState(false);
  const [sampleFinish, setSampleFinish] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    const data = await fetchPrintProducts();
    setProducts(data);
    setIsLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setTitle("");
    setCategory("cards");
    setMaterialSpecs("");
    setImageUrl("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80");
    setGalleryUrls("");
    setMinOrderQty(50);
    setIsTrending(false);
    setSampleFinish("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: PrintProduct) => {
    setEditingProduct(prod);
    setTitle(prod.title);
    setCategory(prod.category);
    setMaterialSpecs(prod.material_specs);
    setImageUrl(prod.image_url);
    setGalleryUrls((prod.gallery_urls || []).join(", "));
    setMinOrderQty(prod.min_order_qty);
    setIsTrending(prod.is_trending);
    setSampleFinish(prod.sample_finish || "");
    setIsModalOpen(true);
  };

  const handleToggleTrending = async (prod: PrintProduct) => {
    const updated = { ...prod, is_trending: !prod.is_trending };
    await savePrintProduct(updated);
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? updated : p))
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this product from the merchandise catalog?")) {
      await deletePrintProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !materialSpecs || !imageUrl) {
      return alert("Title, Material Specs, and Image URL are required.");
    }

    const galleries = galleryUrls
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const productPayload = {
      ...(editingProduct ? { id: editingProduct.id } : {}),
      title,
      category,
      material_specs: materialSpecs,
      image_url: imageUrl,
      gallery_urls: galleries,
      min_order_qty: Number(minOrderQty) || 1,
      is_trending: isTrending,
      sample_finish: sampleFinish || undefined,
    };

    const saved = await savePrintProduct(productPayload);
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === saved.id ? saved : p))
      );
    } else {
      setProducts((prev) => [saved, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f5f0eb] tracking-tight">
            Merchandise & Print Products CMS
          </h1>
          <p className="text-xs text-[#a89f91] mt-1">
            Manage luxury card stocks, acrylic award frames, corporate swag gift suites, and laser engraved merchandise.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c98a4b] hover:bg-[#e5a96b] text-black font-semibold text-xs uppercase tracking-wider transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Merchandise</span>
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-xs text-[#a89f91]">
          Loading print products catalog...
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-xs text-[#a89f91]">
          No products found. Click "Add New Merchandise" to populate.
        </div>
      ) : (
        <div className="rounded-2xl bg-[#141210] border border-[#26201b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0a0a] border-b border-[#26201b] text-[#a89f91] uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Image</th>
                  <th className="py-3.5 px-4">Product Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Material Specs</th>
                  <th className="py-3.5 px-4">MOQ</th>
                  <th className="py-3.5 px-4 text-center">Trending</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26201b]">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#1a1714] transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-14 h-12 rounded-lg overflow-hidden bg-black border border-[#26201b]">
                        <img
                          src={prod.image_url}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs font-bold text-[#f5f0eb]">
                      <div>{prod.title}</div>
                      {prod.sample_finish && (
                        <div className="text-[11px] text-[#c98a4b] font-mono mt-0.5 font-normal">
                          {prod.sample_finish}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#0a0a0a] text-[#c98a4b] border border-[#26201b] capitalize">
                        {prod.category.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-sm text-xs text-[#a89f91] truncate">
                      {prod.material_specs}
                    </td>

                    <td className="py-3 px-4 font-mono text-[#f5f0eb]">
                      {prod.min_order_qty}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleTrending(prod)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          prod.is_trending
                            ? "bg-[#4a2805] text-[#c98a4b] border-[#c98a4b]"
                            : "bg-[#0a0a0a] text-[#696257] border-[#26201b] hover:text-[#a89f91]"
                        }`}
                        title="Toggle Trending Status"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="p-1.5 rounded-lg bg-[#0a0a0a] border border-[#26201b] hover:border-[#c98a4b] text-[#a89f91] hover:text-[#f5f0eb]"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 rounded-lg bg-[#0a0a0a] border border-[#26201b] hover:border-red-900 text-[#a89f91] hover:text-red-400"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#141210] border border-[#3d3126] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#0a0a0a] text-[#a89f91] hover:text-white border border-[#26201b]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-[#c98a4b]">
                Merchandise CMS
              </span>
              <h3 className="text-2xl font-bold text-[#f5f0eb]">
                {editingProduct ? "Edit Product Specs" : "Add Physical Merchandise"}
              </h3>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Luxury Blind Debossed Matte Cards"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PrintCategory)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                  >
                    <option value="cards">Luxury Cards</option>
                    <option value="frames">Executive Frames</option>
                    <option value="corporate_swag">Corporate Swag Boxes</option>
                    <option value="pens">Laser Engraved Pens</option>
                    <option value="banners">Summit Banners</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                    Minimum Order Qty (MOQ) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Material & Print Specifications *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 650 GSM Cotton Uncoated Stock • Deep Espresso Blind Deboss • Warm Bronze Foil Edge Gilding"
                  value={materialSpecs}
                  onChange={(e) => setMaterialSpecs(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Primary Image URL *
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Sample Finish / Technique Highlight (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Velvet Soft-Touch + Deep Tactile Deboss"
                  value={sampleFinish}
                  onChange={(e) => setSampleFinish(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="trending-check"
                  checked={isTrending}
                  onChange={(e) => setIsTrending(e.target.checked)}
                  className="rounded bg-[#0a0a0a] border-[#26201b] text-[#c98a4b] focus:ring-[#c98a4b]"
                />
                <label htmlFor="trending-check" className="text-xs text-[#f5f0eb]">
                  Mark as Trending / Featured Selection
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#26201b]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0a0a0a] text-[#a89f91] hover:text-[#f5f0eb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#c98a4b] text-black font-semibold uppercase tracking-wider text-xs hover:bg-[#e5a96b]"
                >
                  {editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
