import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// La messagerie vit désormais dans l'app 2 volets (/contenu, volet Messages).
export default function MessagesPage() {
  redirect("/contenu?v=messages");
}
