# health-clinic

Aplikacja full-stack do konsultacji medycznych online.

Projekt został zrealizowany w ramach przedmiotu **Programowanie Aplikacji Webowych**.  
Celem było stworzenie elastycznej aplikacji z możliwością dynamicznego wyboru backendu oraz różnymi strategiami autentykacji i persystencji sesji.

---

## Kluczowe funkcjonalności

### Role użytkowników
- **Guest** – przeglądanie listy lekarzy
- **Patient** – rezerwacja wizyt, koszyk, oceny i komentarze
- **Doctor** – zarządzanie harmonogramem, dostępnością i absencjami
- **Admin** – zarządzanie użytkownikami i lekarzami, banowanie, moderacja

### Harmonogram
- widok tygodniowy (sloty 30 min)
- definiowanie dostępności (cyklicznej i jednorazowej)
- obsługa absencji
- rezerwacje z walidacją konfliktów
- anulowanie wizyt
- koszyk z symulacją płatności

### Autentykacja i autoryzacja
Aplikacja obsługuje dwa tryby autentykacji:
- **Firebase Auth**
- **Własna implementacja JWT (access + refresh token)**

Zaimplementowano:
- role-based access control (RBAC)
- ochrona tras po stronie frontendu i backendu
- automatyczne odświeżanie tokenu (refresh flow)
- opcjonalne wymuszenie jednej aktywnej sesji

---

## Architektura

### Frontend
- React + TypeScript
- Context API (zarządzanie stanem autoryzacji)
- Chronione trasy
- Interceptor HTTP do obsługi tokenów

### Backend (Node.js + Express)
- REST API
- Middleware autoryzacyjne
- MongoDB (Atlas)
- JWT (access + refresh tokens)

---

## Dynamiczny wybór backendu

Aplikacja umożliwia przełączanie źródła danych bez zmiany logiki komponentów.

Dostępne tryby:
- `json` – lokalny plik JSON
- `firebase` – Firebase (Database + Auth)
- `rest` – własny serwer REST API + MongoDB

Warstwa serwisów korzysta ze wspólnego interfejsu, dzięki czemu zmiana backendu odbywa się konfiguracyjnie.

---

## Tryby persystencji logowania

Obsługiwane 3 strategie:

- **LOCAL** – użytkownik pozostaje zalogowany po zamknięciu przeglądarki (`localStorage`)
- **SESSION** – sesja trwa do zamknięcia karty (`sessionStorage`)
- **NONE** – dane trzymane tylko w pamięci (wylogowanie po odświeżeniu)

---

## Przykładowe endpointy (REST)
`POST /auth/register`

`POST /auth/login`

`POST /auth/refresh`

`GET /consultations`

`POST /consultations`

`PATCH /consultations/:id`

`DELETE /consultations/:id`

---

Zabezpieczenia:
- weryfikacja JWT
- kontrola ról
- ochrona operacji modyfikujących dane

---

## Technologie

**Frontend**
- React
- TypeScript

**Backend**
- Node.js
- Express
- MongoDB

**Alternatywnie**
- Firebase (Auth + Database)

---

## Uruchomienie

### Backend
`cd server`

`npm install`

`npm run dev`


### Frontend

`npm install`

`npm start`

---

Wymagane:
- MongoDB Atlas URI (dla trybu `rest`)
- Konfiguracja Firebase (dla trybu `firebase`)
- Sekret JWT
