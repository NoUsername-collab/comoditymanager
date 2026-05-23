import { PublicPageShell } from "@/components/public/PublicPageShell";

export default function TermeniPage() {
  return (
    <PublicPageShell
      narrow
      eyebrow="Legal"
      title="Termeni și condiții"
      lead="Reguli clare pentru cererea de cazare online — ce înseamnă confirmarea de la pensiune."
    >
      <div className="public-prose">
        <p>
          Prin trimiterea unei cereri de rezervare pe site, confirmați că ați citit
          acești termeni. Rezervarea devine obligatorie doar după confirmarea
          explicită de către pensiune (email sau telefon).
        </p>
        <h2>1. Cerere vs. confirmare</h2>
        <p>
          Formularul online creează o <strong>cerere</strong>, nu o rezervare
          garantată. Camerele din varianta aleasă sunt reținute provizoriu până
          la răspunsul pensiunii; dacă nu putem confirma, eliberăm perioada.
          Pensiunea vă contactează pentru prețul final.
        </p>
        <h2>2. Ședere minimă</h2>
        <p>
          Minim o noapte. Orele de check-in și check-out sunt cele comunicate de
          pensiune la confirmare.
        </p>
        <h2>3. Anulare</h2>
        <p>
          Condițiile de anulare sau modificare a sejurului sunt comunicate de
          pensiune odată cu confirmarea rezervării.
        </p>
        <h2>4. Contact</h2>
        <p>
          Casa Emil · Tasnad —{" "}
          <a href="mailto:contact@casaemil.ro">contact@casaemil.ro</a>
        </p>
      </div>
    </PublicPageShell>
  );
}
