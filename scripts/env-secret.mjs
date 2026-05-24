import { randomBytes } from "crypto";

const secret = randomBytes(32).toString("hex");
console.log("");
console.log("ADMIN_LOCATION_UNLOCK_SECRET (copiază în Vercel → Environment Variables):");
console.log("");
console.log(secret);
console.log("");
console.log("Minim 32 caractere — folosit pentru cookie-ul de unlock administrare locație.");
console.log("Nu comite valoarea în git.");
console.log("");
