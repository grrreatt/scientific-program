[33m7f920c89[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32msupercar-refactor-20250812[m[33m, [m[1;31morigin/supercar-refactor-20250812[m[33m)[m Fix session display issue in edit-sessions and public-program pages
[33m6e7114ca[m feat(public): persist selected day; add polling fallback when realtime disabled; guard subscriptions; minor UX touchups
[33mca4929e4[m EditSessions: pause polling while editing to prevent input loss; day filter fallback by day_id; PublicProgram: same day filter + lookup
[33mb27b987d[m chore(scripts): load .env.local in smoke save for reliability
[33maae1a8f8[m test(S-004): increase timeout to accommodate polling in JSDOM
