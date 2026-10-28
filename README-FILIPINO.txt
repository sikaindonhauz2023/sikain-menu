SIKAIN WEBSITE — STARTER PROJECT
Slogan: Lokal na Lasang Atin.
Store: 19 Manalili St., Central Signal Village, Taguig City

MAHALAGANG PAALALA
- Ito ay bagong starter website. Hindi pa ito live hangga't hindi naiu-upload sa hosting at naikokonekta sa Supabase.
- Sa unang bukas, Preview/Demo mode lang ito. Hindi secure at hindi permanent ang demo data; huwag gamitin sa totoong customer orders.
- Huwag kailanman ilagay ang Supabase service_role key sa config.js. Supabase Project URL at anon/public key lang.

MGA FILE
- index.html: customer pages at admin panel
- styles.css: design at responsive layout
- app.js: cart, checkout, orders, admin menu, settings, printing
- config.js: Supabase connection
- supabase-setup.sql: database, security policies, image storage at starter menu

SETUP (ANDROID-FRIENDLY)
1. Gumawa o buksan ang Supabase project.
2. Sa Supabase Dashboard, buksan ang SQL Editor > New query.
3. Buksan ang supabase-setup.sql, kopyahin lahat, i-paste sa SQL Editor at pindutin ang Run.
4. Sa Supabase Project Settings > API, kopyahin ang Project URL at anon/public key.
5. I-edit ang config.js at palitan ang dalawang PASTE_... placeholder ng totoong Project URL at anon/public key. Huwag maglagay ng service_role key.
6. Sa Supabase Authentication > Users, gumawa ng admin user gamit ang email at password.
7. Kopyahin ang admin user's UUID.
8. Sa Supabase SQL Editor, patakbuhin ang sumusunod, palitan ang UUID:
   insert into public.admins (user_id) values ('PASTE-ADMIN-USER-UUID-HERE');
9. I-upload ang limang website files (index.html, styles.css, app.js, config.js, supabase-setup.sql) sa bagong GitHub repository. Para sa GitHub Pages, Settings > Pages > Deploy from a branch > main / root > Save.
10. Buksan ang published URL at subukan ang customer order. Mag-login sa Admin para makita ang order.

PAGPALIT NG LOGO / FOOD PHOTO / THEME
- Kapag nakakonekta na at admin login na: Admin > Menu editor para sa food photos at menu.
- Admin > Logo / Theme / Fonts para sa logo URL/upload, kulay, background, banner at font.
- Admin > Store / Delivery para sa store address, Facebook link at delivery fee.
- Ang uploaded images ay sa public Supabase Storage bucket na food-photos mase-save.

GOOGLE MAPS DELIVERY DISTANCE
- Automatic road distance ay nangangailangan ng Google Maps JavaScript API key na may Maps JavaScript API at Distance Matrix service enabled, at billing configured sa Google Cloud.
- Gumamit ng browser key na restricted sa website's HTTP referrers. Huwag gumamit ng server secret key.
- Ilagay ang browser key sa Admin > Store / Delivery. Itakda ang base fee, presyo kada kilometro at maximum delivery distance.
- Kung walang key, hindi makukuwenta ang road distance at hindi makukumpleto ang delivery checkout hanggang ma-set up ito.

THERMAL RECEIPT
- Sa Admin > Orders, pindutin ang Print receipt. Piliin ang thermal printer sa Android/Chrome print dialog. Ang compatibility ay depende sa printer, Android device at driver/app.

SECURITY NOTES
- Customer login is not required.
- Customers can insert orders but cannot list or read all orders. Order tracking uses a limited-field database function.
- Admin access is controlled by the public.admins table. Huwag ibahagi ang admin password.
- Review/test the database rules before using this for real payments or high order volume.
