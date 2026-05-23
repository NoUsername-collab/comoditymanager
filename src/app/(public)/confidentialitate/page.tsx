import { PublicPageShell } from "@/components/public/PublicPageShell";

export default function ConfidentialitatePage() {
  return (
    <PublicPageShell
      narrow
      eyebrow="Legal"
      title="Politica de confidențialitate"
      lead="Cum prelucrăm datele trimise prin formularul de cerere de cazare (GDPR)."
    >
      <div className="public-prose">
        <p>
          Respectăm Regulamentul (UE) 2016/679 (GDPR). Această pagină descrie cum
          prelucrăm datele pe care ni le trimiteți prin formularul de cerere de
          cazare.
        </p>
        <h2>Ce date colectăm</h2>
        <ul>
          <li>Nume, email, telefon (opțional)</li>
          <li>Date despre sejur (check-in, check-out, număr persoane)</li>
          <li>Mesaj opțional și informații despre minori, dacă le furnizați</li>
        </ul>
        <h2>De ce le folosim</h2>
        <p>
          Pentru a răspunde la cererea de cazare, a confirma disponibilitatea și a
          gestiona rezervarea la pensiune.
        </p>
        <h2>Temei legal</h2>
        <p>
          Executarea demersurilor precontractuale la cererea dumneavoastră și
          interesul legitim al operatorului (art. 6 GDPR).
        </p>
        <h2>Durata păstrării</h2>
        <p>
          Păstrăm datele pe durata necesară pentru gestionarea rezervării și
          îndeplinirea obligațiilor legale (contabilitate, fiscalitate).
        </p>
        <h2>Drepturile tale</h2>
        <p>
          Aveți dreptul de acces, rectificare, ștergere, restricționare, opoziție
          și portabilitate. Pentru exercitarea drepturilor, scrieți la{" "}
          <a href="mailto:contact@casaemil.ro">contact@casaemil.ro</a>.
        </p>
      </div>
    </PublicPageShell>
  );
}
