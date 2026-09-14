-- Seed corregido para Supabase
-- Las cadenas de texto usan comillas simples y los apóstrofes internos están escapados.

-- Datos importados de Hamburguesitas.xlsx
insert into public.restaurants (id, name) values (1, 'Frank''s Grill');
insert into public.restaurants (id, name) values (2, 'TFTS | The Food Truck Store');
insert into public.restaurants (id, name) values (3, 'Gordis Burger');
insert into public.restaurants (id, name) values (4, 'Kiddo');
insert into public.restaurants (id, name) values (5, 'Clöe Bakehouse & Burger (@cloebakehouse) · Ramos Mejía');
insert into public.restaurants (id, name) values (6, 'La Birra Bar');
insert into public.restaurants (id, name) values (7, 'LeBross | Burgers Premium (@lebrossoficial) · Ramos Mejía');
insert into public.restaurants (id, name) values (8, 'DimeBurger');
insert into public.restaurants (id, name) values (9, 'Big Pons');
insert into public.restaurants (id, name) values (10, 'WHAT THE BURGER (@whattheburger.ar) • Instagram photos and videos');
insert into public.restaurants (id, name) values (11, 'HELL’S BURGER (@hellsburgerok) • Instagram photos and videos');
insert into public.restaurants (id, name) values (12, 'Perez-H');
insert into public.restaurants (id, name) values (13, 'The Flour Store (@theflourstore) · Buenos Aires');
insert into public.restaurants (id, name) values (14, 'FINO (@fino_arg) • Instagram photos and videos');
insert into public.restaurants (id, name) values (15, 'House of Burgers (@hob.ramosmejia)');
insert into public.restaurants (id, name) values (16, 'El Desembarco');
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (1, 'Nahuel', 7.0, 10.0, 8.0, 8.5, 8.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (1, 'Goia', 8.75, 9.0, 7.0, 9.0, 8.75);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (2, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (2, 'Goia', 10.0, 8.5, 6.0, 6.0, 7.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (3, 'Nahuel', 8.5, 7.5, 7.0, 9.0, 10.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (3, 'Nati', 8.5, 6.5, 7.0, 8.0, 9.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (4, 'Nahuel', 7.5, 8.0, 9.0, 7.0, 8.5);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (5, 'Nahuel', 9.5, 6.0, 9.0, 4.0, 6.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (5, 'Nati', 9.0, 6.0, 8.0, 5.0, 6.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (6, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (6, 'Goia', 7.0, 7.0, 6.0, 6.0, 4.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (6, 'Nati', 7.0, 7.0, 7.0, 7.0, 7.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (7, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (7, 'Nati', 8.5, 7.0, 8.0, null, 6.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (8, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (8, 'Nati', 8.0, 6.0, 7.0, 6.0, 6.0);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (9, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (10, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (11, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (12, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (13, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (14, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (15, 'Nahuel', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (15, 'Nati', null, null, null, null, null);
insert into public.ratings (restaurant_id, reviewer, burger, fries, time, venue, packaging) values (16, 'Nahuel', null, null, null, null, null);

-- Ajustar la secuencia después de importar IDs explícitos
select setval(pg_get_serial_sequence('public.restaurants','id'), coalesce((select max(id) from public.restaurants),1), true);
