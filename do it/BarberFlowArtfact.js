const result = await createArtifact({
  artifactType: "react-vite",
  slug: "barberflow",
  previewPath: "/",
  title: "BarberFlow"
});
console.log(JSON.stringify(result, null, 2));

/* BarberFlow - An Uber-like barber app with:

    User/Customer page - Book barbers, track their location, make payments
    Barber page - Accept bookings, set availability, track earnings
    Admin page - Manage users, barbers, analytics, disputes, pricing
    Live Map - Track barber locations in real-time
    Payment system - Zambian Kwacha (ZMW) and US Dollars (USD)

The design is dark themed with gold accents (#e2b84b), navy background (#07111f), based on the HTML and CSS files. I'll start by creating the React-Vite artifact and setting up the OpenAPI spec with the core entities: Users, Barbers, Bookings, Payments, and Reviews. Then I can run codegen and build out the backend routes and frontend components. I'll use Leaflet.js for the map since it's free and doesn't require API keys, and I'll implement session-based auth with role support for now rather than adding external auth services. For payments, I'll simulate the transactions in ZMW and USD currencies to keep things moving quickly.

Now I'm sketching out the OpenAPI spec with endpoints for authentication, barber profiles and availability, booking management, and payment handling including wallet functionality.

I'm also mapping out the core pages the design team will need to build: a landing page, authentication flows, customer dashboard for discovering and booking barbers, booking history, and wallet management.

On the barber side, there's a dashboard for managing bookings and tracking earnings, plus profile settings. The admin section needs pages for vetting barbers, managing users, viewing analytics, handling disputes, and configuring pricing and payments.

I'm realizing I need to set up the database connection with PostgreSQL and check what environment variables are available—I see SESSION_SECRET is already configured, but I'll need to establish the DATABASE_URL.

Actually, I should follow the parallelism rules here: create the OpenAPI spec and artifact first, run the code generation, launch the design subagent immediately, and then handle the database setup in parallel rather than blocking on it upfront.

I've read both files. The design is BarberFlow — a dark, gold-accented Uber-for-barbers platform. I'll build:

    Customer app — find nearby barbers, book, track on map, pay in ZMW or USD
    Barber app — accept bookings, go online/offline, track earnings
    Admin dashboard — vetting, analytics, pricing, disputes
    Live map — real-time barber location tracking
    Payment system — wallet in Zambian Kwacha (ZMW) and US Dollars (USD)
*/