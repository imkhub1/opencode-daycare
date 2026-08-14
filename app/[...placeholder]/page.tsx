import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/open-daycare";

const destinations: Record<string, string> = {
  "crear-publicacion": "Nueva publicación",
  avisos: "Avisos",
  "mi-cuenta": "Mi cuenta",
  "publicaciones/mateo-logro": "Detalle de publicación",
  "publicaciones/mateo-actividad": "Detalle de publicación",
  "fotos/mateo-temperas": "Foto de Mateo",
  "cerrar-sesion": "Cerrar sesión",
};

export default async function PlaceholderRoute({ params }: PageProps<"/[...placeholder]">) {
  const { placeholder } = await params;
  const title = destinations[placeholder.join("/")];

  if (!title) notFound();

  return <PlaceholderPage title={title} />;
}
