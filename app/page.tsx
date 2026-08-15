"use client";

import Link from "next/link";
import Image from "next/image";
import { type ChangeEvent, type DragEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Avatar, Icon, MobileNavigation, PostCard, Sidebar, type FeedPost, type PostType } from "@/components/open-daycare";

type AudienceChild = "Mateo" | "Sofía" | "Benjamín";
type PostPhoto = { id: string; file: File; previewUrl: string };
type CreatePostForm = { children: AudienceChild[]; wholeRoom: boolean; type: PostType | null; description: string; photos: PostPhoto[] };
type FormErrors = { audience?: string; type?: string; description?: string; photos?: string };

const initialPosts: FeedPost[] = [
  { id: "logro", type: "LOGRO", time: "14:20", audience: "Para: familia de Mateo", body: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.", reactions: 3, comments: 1 },
  { id: "actividad", type: "ACTIVIDAD", time: "09:40", audience: "Para: familia de Mateo", body: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.", reactions: 5, comments: 2, photo: "Foto · pintando con témperas" },
  { id: "anuncio", type: "ANUNCIO", time: "07:50", audience: "Para: toda la sala", body: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.", reactions: 8, comments: 0 },
];

const children: { name: AudienceChild; initial: string; colors: string }[] = [
  { name: "Mateo", initial: "M", colors: "bg-[#a9d9e8] text-[#1f7a93]" },
  { name: "Sofía", initial: "S", colors: "bg-[#f4b8cc] text-[#c44a7a]" },
  { name: "Benjamín", initial: "B", colors: "bg-[#b9dec4] text-[#3e8b62]" },
];

const postTypes: { value: PostType; label: string; selected: string; unselected: string }[] = [
  { value: "COMIDA", label: "Comida", selected: "bg-[#9a7b1e] text-white", unselected: "bg-[#f5ecd3] text-[#80651b]" },
  { value: "SIESTA", label: "Siesta", selected: "bg-[#7b5fc0] text-white", unselected: "bg-[#e7dcf6] text-[#7b5fc0]" },
  { value: "ACTIVIDAD", label: "Actividad", selected: "bg-[#2e89a6] text-white", unselected: "bg-[#c7e7f1] text-[#2e89a6]" },
  { value: "LOGRO", label: "Logro", selected: "bg-[#3e9b6c] text-white", unselected: "bg-[#cfebd8] text-[#3e9b6c]" },
  { value: "ÁNIMO", label: "Ánimo", selected: "bg-[#c56486] text-white", unselected: "bg-[#f9d2de] text-[#c56486]" },
  { value: "FOTO", label: "Foto", selected: "bg-[#d9684a] text-white", unselected: "bg-[#fbd8cc] text-[#d9684a]" },
  { value: "ANUNCIO", label: "Anuncio", selected: "bg-[#4e72c8] text-white", unselected: "bg-[#ccd8f4] text-[#4e72c8]" },
];

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const emptyForm = (): CreatePostForm => ({ children: [], wholeRoom: false, type: null, description: "", photos: [] });

export default function Home() {
  const [posts, setPosts] = useState(initialPosts);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<CreatePostForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDragging, setIsDragging] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const audienceRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) audienceRef.current?.focus();
  }, [isOpen]);

  function openModal(event: React.MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setIsOpen(true);
  }

  function resetForm(revokePreviews = true) {
    if (revokePreviews) form.photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setForm(emptyForm());
    setErrors({});
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeModal() {
    setIsOpen(false);
    resetForm();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function toggleChild(child: AudienceChild) {
    setForm((current) => ({ ...current, wholeRoom: false, children: current.children.includes(child) ? current.children.filter((name) => name !== child) : [...current.children, child] }));
    setErrors((current) => ({ ...current, audience: undefined }));
  }

  function selectWholeRoom() {
    setForm((current) => ({ ...current, wholeRoom: !current.wholeRoom, children: [] }));
    setErrors((current) => ({ ...current, audience: undefined }));
  }

  function addFiles(files: File[]) {
    const validFiles: File[] = [];
    const messages: string[] = [];

    files.forEach((file) => {
      if (!acceptedTypes.has(file.type)) messages.push(`${file.name} no es una imagen compatible.`);
      else if (file.size > 10 * 1024 * 1024) messages.push(`${file.name} supera el límite de 10 MB.`);
      else validFiles.push(file);
    });

    const availableSlots = 6 - form.photos.length;
    if (validFiles.length > availableSlots) messages.push("Podés agregar hasta 6 fotos.");
    const newPhotos = validFiles.slice(0, Math.max(availableSlots, 0)).map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setForm((current) => ({ ...current, photos: [...current.photos, ...newPhotos] }));
    setErrors((current) => ({ ...current, photos: messages.join(" ") || undefined }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removePhoto(id: string) {
    setForm((current) => {
      const photo = current.photos.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return { ...current, photos: current.photos.filter((item) => item.id !== id) };
    });
    setErrors((current) => ({ ...current, photos: undefined }));
  }

  function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!form.wholeRoom && form.children.length === 0) nextErrors.audience = "Elegí al menos un destinatario.";
    if (!form.type) nextErrors.type = "Elegí un tipo de publicación.";
    if (!form.description.trim()) nextErrors.description = "Contá cómo le fue hoy.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.audience) audienceRef.current?.focus();
      else if (nextErrors.type) typeRef.current?.focus();
      else descriptionRef.current?.focus();
      return;
    }

    const audience = form.wholeRoom ? "Para: toda la sala" : `Para: familias de ${form.children.join(" y ")}`;
    setPosts((current) => [{ id: crypto.randomUUID(), type: form.type!, time: new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date()), audience, body: form.description.trim(), reactions: 0, comments: 0, photos: form.photos }, ...current]);
    setIsOpen(false);
    resetForm(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div className="min-h-screen bg-sand md:flex">
      <Sidebar onCreatePost={openModal} />
      <div className="min-w-0 flex-1">
        <MobileNavigation onCreatePost={openModal} />
        <main className="mx-auto max-w-[760px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
          <header className="mb-6"><p className="mb-1 text-xs font-extrabold tracking-[0.08em] text-[#d9583c]">GUARDERÍA · SALA SOLES</p><h1 className="font-display text-3xl font-semibold text-ink">Buenas, Caro</h1><p className="mt-1 text-sm text-muted">12 niños · martes 17 jun</p></header>
          <Link href="/crear-publicacion" className="mb-6 flex items-center gap-3.5 rounded-[18px] border border-line bg-surface px-4 py-3.5 shadow-sm shadow-[#785a3c]/10"><Avatar>C</Avatar><span className="flex-1 text-[15px] text-[#a89a8b]">Compartí un momento…</span><span className="flex size-10 items-center justify-center rounded-xl bg-coral-soft text-coral"><Icon name="camera" className="size-5" /></span></Link>
          <div className="mb-3.5 flex items-center gap-3.5"><span className="text-xs font-extrabold tracking-[0.08em] text-[#8a7c6d]">PUBLICADO HOY</span><span className="h-px flex-1 bg-[#e7dac8]" /></div>
          <div className="flex flex-col gap-4">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
        </main>
      </div>
      {isOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3f362e]/45 p-0 sm:items-center sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }} role="presentation">
        <section aria-labelledby="create-post-title" aria-modal="true" className="max-h-[calc(100dvh-1rem)] w-full max-w-[580px] overflow-y-auto rounded-t-[24px] border border-line bg-[#fbf4ec] shadow-2xl shadow-[#3f362e]/30 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px]" onKeyDown={(event) => { if (event.key === "Escape") closeModal(); }} role="dialog">
          <form onSubmit={handlePublish} noValidate>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-[#fbf4ec] px-5 py-5 sm:px-[26px]"><button className="text-sm font-bold text-muted" type="button" onClick={closeModal}>Cancelar</button><h2 id="create-post-title" className="font-display text-lg font-semibold text-ink">Nueva publicación</h2><button className="text-sm font-extrabold text-[#d9583c]" type="submit">Publicar</button></header>
            <div className="p-5 sm:p-[26px]">
              <fieldset className="mb-[22px]"><legend className="mb-2.5 text-xs font-extrabold tracking-[0.7px] text-muted">PARA</legend><div className="flex flex-wrap gap-2"><button ref={audienceRef} type="button" aria-pressed={form.children.includes("Mateo")} onClick={() => toggleChild("Mateo")} className={`flex items-center gap-2 rounded-full border-1.5 px-3.5 py-1.5 text-sm font-bold ${form.children.includes("Mateo") ? "border-ink bg-ink text-white" : "border-line bg-surface text-[#6e6359]"}`}><span className="flex size-[26px] items-center justify-center rounded-full bg-[#a9d9e8] font-display text-[13px] font-semibold text-[#1f7a93]">M</span>Mateo</button>{children.slice(1).map((child) => <button key={child.name} type="button" aria-pressed={form.children.includes(child.name)} onClick={() => toggleChild(child.name)} className={`flex items-center gap-2 rounded-full border-1.5 px-3.5 py-1.5 text-sm font-bold ${form.children.includes(child.name) ? "border-ink bg-ink text-white" : "border-line bg-surface text-[#6e6359]"}`}><span className={`flex size-[26px] items-center justify-center rounded-full font-display text-[13px] font-semibold ${child.colors}`}>{child.initial}</span>{child.name}</button>)}<button type="button" aria-pressed={form.wholeRoom} onClick={selectWholeRoom} className={`rounded-full border-1.5 px-4 py-1.5 text-sm font-bold ${form.wholeRoom ? "border-ink bg-ink text-white" : "border-line bg-surface text-[#6e6359]"}`}>Toda la sala</button></div>{errors.audience && <p className="mt-2 text-sm font-bold text-[#c5503a]">{errors.audience}</p>}</fieldset>
              <fieldset className="mb-[22px]"><legend className="mb-2.5 text-xs font-extrabold tracking-[0.7px] text-muted">TIPO</legend><div className="flex flex-wrap gap-2">{postTypes.map((item, index) => <button key={item.value} ref={index === 0 ? typeRef : undefined} type="button" aria-pressed={form.type === item.value} onClick={() => { setForm((current) => ({ ...current, type: item.value })); setErrors((current) => ({ ...current, type: undefined })); }} className={`rounded-full px-4 py-2 text-[13.5px] font-extrabold ${form.type === item.value ? item.selected : item.unselected}`}>{item.label}</button>)}</div>{errors.type && <p className="mt-2 text-sm font-bold text-[#c5503a]">{errors.type}</p>}</fieldset>
              <div className="mb-[22px]"><label htmlFor="post-description" className="mb-2.5 block text-xs font-extrabold tracking-[0.7px] text-muted">DESCRIPCIÓN</label><textarea ref={descriptionRef} id="post-description" value={form.description} onChange={(event) => { setForm((current) => ({ ...current, description: event.target.value })); setErrors((current) => ({ ...current, description: undefined })); }} placeholder="Contá cómo le fue hoy…" className="min-h-[120px] w-full resize-y rounded-[14px] border-1.5 border-[#eadfd0] bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink placeholder:text-[#b6a99b]" />{errors.description && <p className="mt-2 text-sm font-bold text-[#c5503a]">{errors.description}</p>}</div>
              <div><p className="mb-2.5 text-xs font-extrabold tracking-[0.7px] text-muted">FOTOS</p><input ref={fileInputRef} className="sr-only" id="post-photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleFileChange} /><div className="flex flex-wrap gap-3">{form.photos.map((photo) => <div key={photo.id} className="relative size-24 overflow-hidden rounded-[14px] border border-line bg-[#f4ece1]"><Image className="object-cover" src={photo.previewUrl} alt={photo.file.name} fill sizes="96px" unoptimized /><button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Eliminar ${photo.file.name}`} className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-[#3f362e]/80 text-lg leading-none text-white">×</button></div>)}{form.photos.length < 6 && <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`flex size-24 flex-col items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed bg-[#f4ece1] ${isDragging ? "border-coral text-coral" : "border-[#dbcdba] text-[#b0a290]"}`}><button type="button" onClick={() => fileInputRef.current?.click()} className="flex size-full cursor-pointer flex-col items-center justify-center gap-1.5"><Icon name="plus" className="size-[22px] text-[#c5503a]" /><span className="text-xs">Agregar</span></button></div>}</div>{errors.photos && <p className="mt-2 text-sm font-bold text-[#c5503a]">{errors.photos}</p>}<p className="mt-2 text-xs text-muted">Hasta 6 fotos JPEG, PNG, WebP o GIF de 10 MB cada una.</p></div>
            </div>
          </form>
        </section>
      </div>}
    </div>
  );
}
