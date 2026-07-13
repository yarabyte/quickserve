"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";

import {
  createMenuItemAction,
  deleteMenuItemAction,
  updateMenuItemAction,
  uploadMenuImageAction,
} from "@/lib/dashboard/menu-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";

export type MenuItemRow = {
  id: string;
  categoryName: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceXAF: number;
  isAvailable: boolean;
  externalRef: string;
};

type FormState = {
  categoryName: string;
  name: string;
  description: string;
  priceXAF: string;
  isAvailable: boolean;
  imageUrl: string | null;
};

const emptyForm = (): FormState => ({
  categoryName: "Plats",
  name: "",
  description: "",
  priceXAF: "",
  isAvailable: true,
  imageUrl: null,
});

export function MenuClient({
  restaurantId,
  restaurantName,
  items,
}: {
  restaurantId: string;
  restaurantName: string;
  items: MenuItemRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const lang = "fr";

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setMessage(null);
  }

  function openEdit(item: MenuItemRow) {
    setEditingId(item.id);
    setForm({
      categoryName: item.categoryName,
      name: item.name,
      description: item.description ?? "",
      priceXAF: String(item.priceXAF),
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl,
    });
    setShowForm(true);
    setMessage(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadMenuImageAction(restaurantId, fd);
      setForm((prev) => ({ ...prev, imageUrl: result.url }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload échoué");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submitForm() {
    startTransition(async () => {
      try {
        const payload = {
          categoryName: form.categoryName,
          name: form.name,
          description: form.description || null,
          priceXAF: Number(form.priceXAF),
          isAvailable: form.isAvailable,
          imageUrl: form.imageUrl,
        };
        if (editingId) {
          await updateMenuItemAction(restaurantId, editingId, payload);
          setMessage("Plat mis à jour");
        } else {
          await createMenuItemAction(restaurantId, payload);
          setMessage("Plat ajouté");
        }
        closeForm();
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erreur");
      }
    });
  }

  function removeItem(itemId: string) {
    if (!window.confirm("Supprimer ce plat ?")) return;
    startTransition(async () => {
      try {
        await deleteMenuItemAction(restaurantId, itemId);
        setMessage("Plat supprimé");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Suppression échouée");
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UtensilsCrossed}
        title={t("dash.menu.title", lang, { name: restaurantName })}
        description={t("dash.menu.desc", lang)}
        actions={
          <Button size="sm" onClick={openCreate} disabled={pending}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("dash.menu.add", lang)}
          </Button>
        }
      />

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {message}
        </p>
      ) : null}

      {showForm ? (
        <Card>
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {editingId ? t("dash.menu.edit", lang) : t("dash.menu.add", lang)}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryName">{t("dash.menu.category", lang)}</Label>
                <Input
                  id="categoryName"
                  value={form.categoryName}
                  onChange={(e) => setForm((p) => ({ ...p, categoryName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t("dash.menu.name", lang)}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">{t("dash.menu.description", lang)}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceXAF">{t("dash.menu.price", lang)}</Label>
                <Input
                  id="priceXAF"
                  type="number"
                  min={0}
                  step={50}
                  value={form.priceXAF}
                  onChange={(e) => setForm((p) => ({ ...p, priceXAF: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm((p) => ({ ...p, isAvailable: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  {t("dash.menu.available", lang)}
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <UtensilsCrossed className="h-5 w-5" aria-hidden />
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || pending}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                  {uploading ? t("dash.menu.uploading", lang) : t("dash.menu.photo", lang)}
                </Button>
                {form.imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((p) => ({ ...p, imageUrl: null }))}
                  >
                    {t("dash.menu.remove_photo", lang)}
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={pending}>
                {t("dash.menu.cancel", lang)}
              </Button>
              <Button
                type="button"
                disabled={pending || uploading || !form.name.trim() || form.priceXAF === ""}
                onClick={submitForm}
              >
                {pending ? "…" : t("dash.menu.save", lang)}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {items.length === 0 ? (
          <Card className="sm:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" aria-hidden />
              <p>{t("dash.menu.empty", lang)}</p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t("dash.menu.add", lang)}
              </Button>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-3 py-5">
                <div className="flex min-w-0 gap-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <UtensilsCrossed className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
                      {item.categoryName}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                      {item.name}
                    </p>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-xl font-semibold">
                    {item.priceXAF.toLocaleString("fr-FR")}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">FCFA</span>
                  </p>
                  <Badge variant={item.isAvailable ? "success" : "danger"} className="mt-2">
                    {item.isAvailable ? "Dispo" : "Indispo"}
                  </Badge>
                  <div className="mt-3 flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => openEdit(item)}
                      aria-label="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => removeItem(item.id)}
                      aria-label="supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
