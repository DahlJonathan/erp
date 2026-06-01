# Iisiduuni ERP

Kevyt selainpohjainen ERP-sovellus asiakkuuksien, projektien, tuntikirjausten, hyväksynnän ja laskutuksen hallintaan.

Sovellus on rakennettu Reactilla, TypeScriptillä ja Vitellä. Data tallennetaan Supabaseen, kirjautuminen hoidetaan Supabase Authilla ja tuotantobuildi on valmiiksi sovitettu Netlifyyn.

## Ominaisuudet

- Asiakasrekisteri yhteys- ja laskutustiedoilla.
- Projektien luonti, muokkaus, budjetointi, tuntihinta ja määräpäivä.
- Projektikohtaiset tehtävät ja tilat.
- Tuntikirjaukset laskutettaville ja ei-laskutettaville töille.
- Tuntien hyväksyntä ennen laskutusta.
- Laskuluonnosten generointi hyväksytyistä tunneista.
- Laskujen tilaseuranta: luonnos, lähetetty, maksettu ja erääntynyt.
- PDF-tulosteet projekteille ja laskuille.
- Yritysasetukset, maksuehdot ja logo.
- Historia- ja yhteenvetonäkymät raportointiin.
- Netlify-funktiot laskujen sähköpostitukseen ja AI-analyysiin.

## Teknologiat

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Supabase JavaScript client
- Supabase Auth ja Row Level Security
- Netlify Functions
- React PDF
- Lucide React

## Vaatimukset

- Node.js 20+
- npm 10+
- Supabase-projekti
- Netlify CLI tai Netlify-projekti, jos haluat käyttää serverless-funktioita paikallisesti tai tuotannossa

## Käyttöönotto

Asenna riippuvuudet:

```bash
npm install
```

Luo projektin juureen `.env`-tiedosto:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Jos käytät Netlify-funktioita, lisää nämä Netlifyn ympäristömuuttujiin tai paikalliseen ajotapaan:

```env
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=sender@example.com
BREVO_SENDER_NAME=Iisiduuni
OPENAI_API_KEY=your-openai-api-key
```

Päivitä Supabase-tietokanta migraatioilla:

```text
supabase/migrations/
  20260505_add_client_billing_fields.sql
  20260518_add_auth_rls.sql
  20260525_add_project_due_date.sql
  20260525_add_tasks.sql
  20260525_add_user_settings.sql
```

Käynnistä kehityspalvelin:

```bash
npm run dev
```

Vite avaa sovelluksen yleensä osoitteeseen `http://localhost:5173`.

## Komennot

```bash
npm run dev      # käynnistää kehityspalvelimen
```

## Sovelluksen näkymät

- `Yhteenveto`: KPI:t, projektien tilanne ja tehtävien kokonaiskuva.
- `Seuranta`: projektien luonti, tuntikirjaukset, projektilista ja tehtävät.
- `Hallinta`: tuntien hyväksyntä ja laskujen muodostaminen.
- `Historia`: projektien, laskujen ja tuntikirjausten tarkastelu.
- `Asiakkaat`: asiakastietojen hallinta.
- `Asetukset`: yritystiedot, maksuehdot ja logo laskuille.

## Tietomalli

Keskeiset taulut:

- `clients`
- `projects`
- `time_entries`
- `invoices`
- `tasks`
- `user_settings`

TypeScript-tyypit ovat tiedostossa `src/types/types.ts`. Supabasen rivimuunnokset sovelluksen domain-malleihin ovat tiedostossa `src/data/supabaseMappers.ts`.

## Projektin rakenne

```text
src/
  components/        Sovelluksen näkymät ja käyttöliittymäkomponentit
  data/              Supabase-mapperit
  types/             Domain-tyypit
  utils/             Yleiset apufunktiot
  supabaseClient.ts  Supabase-clientin alustus

netlify/
  functions/         Serverless-funktiot sähköpostille ja AI-analyysille

supabase/
  migrations/        Tietokantamuutokset
```

## Netlify

`netlify.toml` määrittää tuotantobuildin:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

Sähköpostilähetys käyttää Brevon SMTP APIa funktion `send-invoice-email` kautta. AI-analyysi käyttää funktiota `ai-analyze`, joka välittää pyynnön OpenAI APIlle.

## Huomioita kehitykseen

- Sovellus kaatuu tarkoituksella heti, jos `VITE_SUPABASE_URL` tai `VITE_SUPABASE_ANON_KEY` puuttuu.
- Data ladataan kirjautuneelle käyttäjälle Supabasesta sovelluksen käynnistyessä.
- Migraatio `20260518_add_auth_rls.sql` lisää autentikointiin ja RLS-käyttöön liittyviä muutoksia.
- Älä commitoi `.env`-tiedostoa tai API-avaimia.

