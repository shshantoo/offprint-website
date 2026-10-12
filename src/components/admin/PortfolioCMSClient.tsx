"use client";

import React, { useState, useEffect } from "react";
import { PortfolioProject, PortfolioCategory } from "@/types/database";
import {
  fetchPortfolioProjects,
  savePortfolioProject,
  deletePortfolioProject,
} from "@/lib/data-service";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  ExternalLink,
  X,
  Check,
  Film,
  Calendar,
  User,
  Star,
} from "lucide-react";

export default function PortfolioCMSClient() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [category, setCategory] = useState<PortfolioCategory>("corporate_summit");
  const [isFlagship, setIsFlagship] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [completedDate, setCompletedDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await fetchPortfolioProjects();
    setProjects(data);
    setIsLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setTitle("");
    setClientName("");
    setCategory("corporate_summit");
    setIsFlagship(false);
    setThumbnailUrl("https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80");
    setGalleryUrls("");
    setVideoUrl("");
    setCompletedDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proj: PortfolioProject) => {
    setEditingProject(proj);
    setTitle(proj.title);
    setClientName(proj.client_name);
    setCategory(proj.category);
    setIsFlagship(proj.is_flagship);
    setThumbnailUrl(proj.thumbnail_url);
    setGalleryUrls((proj.gallery_urls || []).join(", "));
    setVideoUrl(proj.video_url || "");
    setCompletedDate(proj.completed_date || "");
    setDescription(proj.description || "");
    setIsModalOpen(true);
  };

  const handleToggleFlagship = async (proj: PortfolioProject) => {
    const updated = { ...proj, is_flagship: !proj.is_flagship };
    await savePortfolioProject(updated);
    setProjects((prev) =>
      prev.map((p) => (p.id === proj.id ? updated : p))
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this project from portfolio?")) {
      await deletePortfolioProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientName || !thumbnailUrl) {
      return alert("Title, Client Name, and Thumbnail URL are required.");
    }

    const galleries = galleryUrls
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const projectPayload = {
      ...(editingProject ? { id: editingProject.id } : {}),
      title,
      client_name: clientName,
      category,
      is_flagship: isFlagship,
      thumbnail_url: thumbnailUrl,
      gallery_urls: galleries,
      video_url: videoUrl || null,
      completed_date: completedDate || null,
      description,
    };

    const saved = await savePortfolioProject(projectPayload);
    if (editingProject) {
      setProjects((prev) =>
        prev.map((p) => (p.id === saved.id ? saved : p))
      );
    } else {
      setProjects((prev) => [saved, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f5f0eb] tracking-tight">
            Portfolio Management CMS
          </h1>
          <p className="text-xs text-[#a89f91] mt-1">
            Curate corporate summits, documentaries, and executive headshots displayed across the public showcase.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c98a4b] hover:bg-[#e5a96b] text-black font-semibold text-xs uppercase tracking-wider transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Project</span>
        </button>
      </div>

      {/* Table / List View */}
      {isLoading ? (
        <div className="text-center py-16 text-xs text-[#a89f91]">
          Loading portfolio works...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-xs text-[#a89f91]">
          No portfolio projects found. Click "Add New Project" to create one.
        </div>
      ) : (
        <div className="rounded-2xl bg-[#141210] border border-[#26201b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0a0a] border-b border-[#26201b] text-[#a89f91] uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Thumbnail</th>
                  <th className="py-3.5 px-4">Project Title & Client</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Completed Date</th>
                  <th className="py-3.5 px-4 text-center">Flagship</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26201b]">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-[#1a1714] transition-colors">
                    {/* Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="w-16 h-10 rounded-lg overflow-hidden bg-black border border-[#26201b]">
                        <img
                          src={proj.thumbnail_url}
                          alt={proj.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    {/* Title & Client */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-[#f5f0eb] truncate">{proj.title}</div>
                      <div className="text-[#a89f91] text-[11px] truncate flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-[#c98a4b]" />
                        <span>{proj.client_name}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#0a0a0a] text-[#c98a4b] border border-[#26201b] capitalize">
                        {proj.category.replace("_", " ")}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[#a89f91]">
                      {formatDate(proj.completed_date || undefined)}
                    </td>

                    {/* Flagship Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleFlagship(proj)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          proj.is_flagship
                            ? "bg-[#4a2805] text-[#c98a4b] border-[#c98a4b]"
                            : "bg-[#0a0a0a] text-[#696257] border-[#26201b] hover:text-[#a89f91]"
                        }`}
                        title="Toggle Flagship Showcase"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(proj)}
                        className="p-1.5 rounded-lg bg-[#0a0a0a] border border-[#26201b] hover:border-[#c98a4b] text-[#a89f91] hover:text-[#f5f0eb]"
                        title="Edit Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id)}
                        className="p-1.5 rounded-lg bg-[#0a0a0a] border border-[#26201b] hover:border-red-900 text-[#a89f91] hover:text-red-400"
                        title="Delete Project"
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

      {/* Add / Edit Project Modal */}
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
                Portfolio CMS
              </span>
              <h3 className="text-2xl font-bold text-[#f5f0eb]">
                {editingProject ? "Edit Project Details" : "Publish New Media Project"}
              </h3>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bangladesh Tech Leaders Summit 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka Chamber of IT Leaders"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PortfolioCategory)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                  >
                    <option value="corporate_summit">Corporate Summit</option>
                    <option value="documentary">Brand Documentary</option>
                    <option value="headshot">Executive Headshot</option>
                    <option value="workshop">Workshop</option>
                    <option value="wedding">Seasonal Wedding</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Thumbnail Image URL *
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Gallery URLs (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="https://..., https://..."
                  value={galleryUrls}
                  onChange={(e) => setGalleryUrls(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                    Video Reel URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#f5f0eb] block mb-1">
                  Scope & Deliverables Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe multicamera gear, lighting, and deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="flagship-check"
                  checked={isFlagship}
                  onChange={(e) => setIsFlagship(e.target.checked)}
                  className="rounded bg-[#0a0a0a] border-[#26201b] text-[#c98a4b] focus:ring-[#c98a4b]"
                />
                <label htmlFor="flagship-check" className="text-xs text-[#f5f0eb]">
                  Feature as Flagship on Homepage Grid
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
                  {editingProject ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
