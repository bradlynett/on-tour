-- Comprehensive seed data for Concert Travel App

-- Insert test users (password_hash is bcrypt hash of 'password')
INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES
('john.doe@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', '+1-555-0101'),
('jane.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', '+1-555-0102'),
('mike.johnson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Johnson', '+1-555-0103'),
('sarah.wilson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Wilson', '+1-555-0104'),
('david.brown@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David', 'Brown', '+1-555-0105');

-- Insert user addresses
INSERT INTO user_addresses (user_id, address_line1, address_line2, city, state, zip_code, is_primary) VALUES
(1, '123 Main St', 'Apt 4B', 'New York', 'NY', '10001', true),
(1, '456 Oak Ave', NULL, 'Los Angeles', 'CA', '90210', false),
(2, '789 Pine Rd', 'Suite 200', 'Chicago', 'IL', '60601', true),
(3, '321 Elm St', NULL, 'Miami', 'FL', '33101', true),
(4, '654 Maple Dr', 'Unit 15', 'Seattle', 'WA', '98101', true),
(5, '987 Cedar Ln', NULL, 'Austin', 'TX', '73301', true);

-- Insert payment methods
INSERT INTO payment_methods (user_id, card_type, last_four, expiry_month, expiry_year, is_default, encrypted_data) VALUES
(1, 'Visa', '1234', 12, 2025, true, 'encrypted_card_data_1'),
(1, 'Mastercard', '5678', 8, 2026, false, 'encrypted_card_data_2'),
(2, 'Amex', '9012', 3, 2025, true, 'encrypted_card_data_3'),
(3, 'Visa', '3456', 11, 2027, true, 'encrypted_card_data_4'),
(4, 'Mastercard', '7890', 6, 2026, true, 'encrypted_card_data_5'),
(5, 'Visa', '2345', 9, 2025, true, 'encrypted_card_data_6');

-- Insert travel preferences
INSERT INTO travel_preferences (user_id, primary_airport, preferred_airlines, flight_class, preferred_hotel_brands, rental_car_preference, reward_programs) VALUES
(1, 'JFK', ARRAY['Delta', 'United', 'JetBlue'], 'business', ARRAY['Marriott', 'Hilton'], 'Hertz', ARRAY['Delta SkyMiles', 'Hilton Honors']),
(2, 'ORD', ARRAY['American', 'United', 'Southwest'], 'economy', ARRAY['Hyatt', 'Marriott'], 'Enterprise', ARRAY['American AAdvantage', 'Hyatt Gold Passport']),
(3, 'MIA', ARRAY['American', 'Spirit', 'JetBlue'], 'premium_economy', ARRAY['Hilton', 'Sheraton'], 'Avis', ARRAY['American AAdvantage', 'Hilton Honors']),
(4, 'SEA', ARRAY['Alaska', 'Delta', 'United'], 'economy', ARRAY['Marriott', 'Hyatt'], 'Budget', ARRAY['Alaska Mileage Plan', 'Marriott Bonvoy']),
(5, 'AUS', ARRAY['Southwest', 'American', 'United'], 'business', ARRAY['Hilton', 'Marriott'], 'Hertz', ARRAY['Southwest Rapid Rewards', 'Hilton Honors']);

-- Insert user interests
INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES
-- John's interests
(1, 'artist', 'Taylor Swift', 1),
(1, 'artist', 'Ed Sheeran', 2),
(1, 'genre', 'Pop', 1),
(1, 'venue', 'Madison Square Garden', 1),
(1, 'city', 'New York', 1),
(1, 'city', 'Los Angeles', 2),

-- Jane's interests
(2, 'artist', 'Beyoncé', 1),
(2, 'artist', 'Drake', 2),
(2, 'genre', 'R&B', 1),
(2, 'genre', 'Hip Hop', 2),
(2, 'venue', 'United Center', 1),
(2, 'city', 'Chicago', 1),

-- Mike's interests
(3, 'artist', 'Bad Bunny', 1),
(3, 'artist', 'Shakira', 2),
(3, 'genre', 'Latin', 1),
(3, 'venue', 'American Airlines Arena', 1),
(3, 'city', 'Miami', 1),

-- Sarah's interests
(4, 'artist', 'Pearl Jam', 1),
(4, 'artist', 'Nirvana', 2),
(4, 'genre', 'Rock', 1),
(4, 'venue', 'Climate Pledge Arena', 1),
(4, 'city', 'Seattle', 1),

-- David's interests
(5, 'artist', 'Willie Nelson', 1),
(5, 'artist', 'Gary Clark Jr.', 2),
(5, 'genre', 'Country', 1),
(5, 'genre', 'Blues', 2),
(5, 'venue', 'Moody Center', 1),
(5, 'city', 'Austin', 1);

-- Insert comprehensive events
INSERT INTO events (external_id, name, artist, venue_name, venue_city, venue_state, event_date, ticket_url, min_price, max_price) VALUES
-- Major Pop/Rock Events
('evt_001', 'The Eras Tour', 'Taylor Swift', 'MetLife Stadium', 'East Rutherford', 'NJ', '2024-05-25 20:00:00', 'https://ticketmaster.com/eras-tour', 150.00, 1200.00),
('evt_002', 'Renaissance World Tour', 'Beyoncé', 'Soldier Field', 'Chicago', 'IL', '2024-06-15 19:30:00', 'https://ticketmaster.com/renaissance-tour', 200.00, 1500.00),
('evt_003', 'Un Verano Sin Ti Tour', 'Bad Bunny', 'Hard Rock Stadium', 'Miami Gardens', 'FL', '2024-07-10 21:00:00', 'https://ticketmaster.com/bad-bunny-tour', 100.00, 800.00),
('evt_004', 'Darkness and Light Tour', 'Pearl Jam', 'Climate Pledge Arena', 'Seattle', 'WA', '2024-08-05 20:00:00', 'https://ticketmaster.com/pearl-jam-tour', 80.00, 600.00),
('evt_005', 'Outlaw Music Festival', 'Willie Nelson', 'Moody Center', 'Austin', 'TX', '2024-09-20 19:00:00', 'https://ticketmaster.com/outlaw-festival', 60.00, 400.00),
('evt_006', 'Mathematics Tour', 'Ed Sheeran', 'Madison Square Garden', 'New York', 'NY', '2024-10-12 20:00:00', 'https://ticketmaster.com/ed-sheeran-tour', 120.00, 900.00),
('evt_007', 'It''s All a Blur Tour', 'Drake', 'United Center', 'Chicago', 'IL', '2024-11-08 20:30:00', 'https://ticketmaster.com/drake-tour', 180.00, 1200.00),
('evt_008', 'Las Mujeres Ya No Lloran Tour', 'Shakira', 'American Airlines Arena', 'Miami', 'FL', '2024-12-03 21:00:00', 'https://ticketmaster.com/shakira-tour', 90.00, 700.00),

-- Additional Events for More Variety
('evt_009', 'Summerfest 2024', 'Various Artists', 'Henry Maier Festival Park', 'Milwaukee', 'WI', '2024-07-04 14:00:00', 'https://summerfest.com', 45.00, 300.00),
('evt_010', 'Coachella Valley Music Festival', 'Various Artists', 'Empire Polo Club', 'Indio', 'CA', '2024-04-12 12:00:00', 'https://coachella.com', 500.00, 2000.00),
('evt_011', 'Lollapalooza', 'Various Artists', 'Grant Park', 'Chicago', 'IL', '2024-08-01 12:00:00', 'https://lollapalooza.com', 350.00, 1500.00),
('evt_012', 'Austin City Limits Festival', 'Various Artists', 'Zilker Park', 'Austin', 'TX', '2024-10-04 12:00:00', 'https://aclfestival.com', 275.00, 1200.00),
('evt_013', 'Bonnaroo Music Festival', 'Various Artists', 'Great Stage Park', 'Manchester', 'TN', '2024-06-13 12:00:00', 'https://bonnaroo.com', 350.00, 1800.00),
('evt_014', 'Electric Daisy Carnival', 'Various Artists', 'Las Vegas Motor Speedway', 'Las Vegas', 'NV', '2024-05-17 18:00:00', 'https://edc.com', 400.00, 2000.00),
('evt_015', 'Stagecoach Festival', 'Various Artists', 'Empire Polo Club', 'Indio', 'CA', '2024-04-26 12:00:00', 'https://stagecoachfestival.com', 300.00, 1500.00);

-- Insert comprehensive trip suggestions
INSERT INTO trip_suggestions (user_id, event_id, status, total_cost, service_fee) VALUES
-- John's trips
(1, 1, 'approved', 1250.00, 62.50),
(1, 6, 'pending', 850.00, 42.50),
(1, 10, 'booked', 1800.00, 90.00),

-- Jane's trips
(2, 2, 'booked', 1400.00, 70.00),
(2, 7, 'pending', 1100.00, 55.00),
(2, 11, 'approved', 1200.00, 60.00),

-- Mike's trips
(3, 3, 'approved', 750.00, 37.50),
(3, 8, 'rejected', 600.00, 30.00),
(3, 14, 'pending', 1500.00, 75.00),

-- Sarah's trips
(4, 4, 'booked', 650.00, 32.50),
(4, 13, 'pending', 1000.00, 50.00),

-- David's trips
(5, 5, 'pending', 450.00, 22.50),
(5, 12, 'approved', 800.00, 40.00);

-- Insert detailed trip components
INSERT INTO trip_components (trip_suggestion_id, component_type, provider, price, details, booking_reference) VALUES
-- Trip 1: John's Taylor Swift trip (MetLife Stadium)
(1, 'flight', 'Delta Airlines', 425.00, '{"departure": "JFK", "arrival": "EWR", "flight_number": "DL1234", "departure_time": "2024-05-25T16:00:00Z", "arrival_time": "2024-05-25T17:30:00Z", "aircraft": "Boeing 737-800", "class": "business", "seat": "2A"}', 'DL123456789'),
(1, 'hotel', 'Marriott', 285.00, '{"hotel_name": "Newark Airport Marriott", "check_in": "2024-05-25", "check_out": "2024-05-26", "room_type": "King Room", "amenities": ["Free WiFi", "Airport Shuttle", "Restaurant"], "distance": "2.5 miles from venue"}', 'MAR987654321'),
(1, 'ticket', 'Ticketmaster', 450.00, '{"section": "100", "row": "A", "seat": "15", "ticket_type": "VIP Package", "includes": ["Early Entry", "Exclusive Merchandise", "Meet & Greet"]}', 'TM123456789'),
(1, 'transportation', 'Uber', 85.00, '{"service": "Uber Black", "pickup": "EWR Airport", "dropoff": "MetLife Stadium", "estimated_time": "25 minutes", "vehicle": "Lincoln Navigator"}', 'UBER123456'),

-- Trip 2: John's Ed Sheeran trip (MSG)
(2, 'flight', 'United Airlines', 180.00, '{"departure": "JFK", "arrival": "LGA", "flight_number": "UA5678", "departure_time": "2024-10-12T18:00:00Z", "arrival_time": "2024-10-12T18:45:00Z", "aircraft": "Airbus A320", "class": "economy", "seat": "12C"}', 'UA987654321'),
(2, 'hotel', 'Hilton', 320.00, '{"hotel_name": "Hilton Midtown Manhattan", "check_in": "2024-10-12", "check_out": "2024-10-13", "room_type": "Deluxe King", "amenities": ["City View", "Room Service", "Fitness Center"], "distance": "0.8 miles from venue"}', 'HILTON123456'),
(2, 'ticket', 'Ticketmaster', 280.00, '{"section": "200", "row": "B", "seat": "8", "ticket_type": "Premium Seating"}', 'TM987654321'),
(2, 'transportation', 'Lyft', 25.00, '{"service": "Lyft XL", "pickup": "Hilton Midtown", "dropoff": "Madison Square Garden", "estimated_time": "8 minutes"}', 'LYFT123456'),

-- Trip 3: John's Coachella trip
(3, 'flight', 'JetBlue', 650.00, '{"departure": "JFK", "arrival": "PSP", "flight_number": "B61234", "departure_time": "2024-04-12T08:00:00Z", "arrival_time": "2024-04-12T11:30:00Z", "aircraft": "Airbus A321", "class": "business", "seat": "1A"}', 'B6123456789'),
(3, 'hotel', 'Marriott', 450.00, '{"hotel_name": "Marriott Desert Springs", "check_in": "2024-04-12", "check_out": "2024-04-15", "room_type": "Resort View King", "amenities": ["Pool", "Spa", "Golf Course"], "distance": "15 miles from venue"}', 'MAR456789123'),
(3, 'ticket', 'Coachella', 800.00, '{"ticket_type": "3-Day General Admission", "includes": ["Access to all stages", "Food vendors", "Art installations"]}', 'COACHELLA123'),
(3, 'transportation', 'Uber', 120.00, '{"service": "Uber Black", "pickup": "PSP Airport", "dropoff": "Empire Polo Club", "estimated_time": "35 minutes"}', 'UBER789123'),

-- Trip 4: Jane's Beyoncé trip (Soldier Field)
(4, 'flight', 'American Airlines', 220.00, '{"departure": "ORD", "arrival": "ORD", "flight_number": "AA9012", "departure_time": "2024-06-15T17:00:00Z", "arrival_time": "2024-06-15T17:45:00Z", "aircraft": "Boeing 737", "class": "economy", "seat": "15D"}', 'AA123456789'),
(4, 'hotel', 'Hyatt', 195.00, '{"hotel_name": "Hyatt Regency Chicago", "check_in": "2024-06-15", "check_out": "2024-06-16", "room_type": "Standard Queen", "amenities": ["River View", "Restaurant", "Bar"], "distance": "1.2 miles from venue"}', 'HYATT789123'),
(4, 'ticket', 'Ticketmaster', 650.00, '{"section": "200", "row": "B", "seat": "8", "ticket_type": "VIP Floor Seating", "includes": ["Premium View", "Exclusive Lounge Access"]}', 'TM456789123'),
(4, 'transportation', 'Lyft', 35.00, '{"service": "Lyft XL", "pickup": "Hyatt Regency", "dropoff": "Soldier Field", "estimated_time": "12 minutes"}', 'LYFT789123'),

-- Trip 5: Jane's Drake trip (United Center)
(5, 'flight', 'United Airlines', 0.00, '{"departure": "ORD", "arrival": "ORD", "flight_number": "UA3456", "departure_time": "2024-11-08T19:00:00Z", "arrival_time": "2024-11-08T19:30:00Z", "aircraft": "Airbus A320", "class": "economy", "seat": "8A", "note": "Local trip"}', 'UA456789123'),
(5, 'hotel', 'Marriott', 180.00, '{"hotel_name": "Marriott Chicago Downtown", "check_in": "2024-11-08", "check_out": "2024-11-09", "room_type": "Standard King", "amenities": ["Downtown Location", "Fitness Center"], "distance": "0.5 miles from venue"}', 'MAR789123456'),
(5, 'ticket', 'Ticketmaster', 450.00, '{"section": "100", "row": "C", "seat": "12", "ticket_type": "Premium Seating"}', 'TM789123456'),
(5, 'transportation', 'Uber', 15.00, '{"service": "UberX", "pickup": "Marriott Downtown", "dropoff": "United Center", "estimated_time": "5 minutes"}', 'UBER456789'),

-- Trip 6: Jane's Lollapalooza trip
(6, 'flight', 'Southwest Airlines', 280.00, '{"departure": "ORD", "arrival": "MDW", "flight_number": "WN7890", "departure_time": "2024-08-01T10:00:00Z", "arrival_time": "2024-08-01T10:45:00Z", "aircraft": "Boeing 737", "class": "economy", "seat": "12B"}', 'WN789012345'),
(6, 'hotel', 'Hyatt', 350.00, '{"hotel_name": "Hyatt Centric Chicago", "check_in": "2024-08-01", "check_out": "2024-08-04", "room_type": "Deluxe King", "amenities": ["Lake View", "Restaurant", "Bar"], "distance": "0.3 miles from venue"}', 'HYATT456789'),
(6, 'ticket', 'Lollapalooza', 400.00, '{"ticket_type": "3-Day General Admission", "includes": ["Access to all stages", "Food vendors", "Art installations"]}', 'LOLA123456'),
(6, 'transportation', 'Lyft', 45.00, '{"service": "Lyft XL", "pickup": "MDW Airport", "dropoff": "Grant Park", "estimated_time": "20 minutes"}', 'LYFT456789'),

-- Trip 7: Mike's Bad Bunny trip (Hard Rock Stadium)
(7, 'flight', 'Spirit Airlines', 95.00, '{"departure": "MIA", "arrival": "FLL", "flight_number": "NK1234", "departure_time": "2024-07-10T19:00:00Z", "arrival_time": "2024-07-10T19:45:00Z", "aircraft": "Airbus A320", "class": "economy", "seat": "18C"}', 'NK123456789'),
(7, 'hotel', 'Hilton', 165.00, '{"hotel_name": "Hilton Fort Lauderdale", "check_in": "2024-07-10", "check_out": "2024-07-11", "room_type": "Standard Double", "amenities": ["Beach Access", "Pool", "Restaurant"], "distance": "3.2 miles from venue"}', 'HILTON789123'),
(7, 'ticket', 'Ticketmaster', 350.00, '{"section": "300", "row": "C", "seat": "12", "ticket_type": "General Admission Floor"}', 'TM789123456'),
(7, 'transportation', 'Uber', 45.00, '{"service": "UberX", "pickup": "FLL Airport", "dropoff": "Hard Rock Stadium", "estimated_time": "15 minutes"}', 'UBER789123'),

-- Trip 8: Mike's EDC trip (Las Vegas)
(9, 'flight', 'American Airlines', 420.00, '{"departure": "MIA", "arrival": "LAS", "flight_number": "AA5678", "departure_time": "2024-05-17T14:00:00Z", "arrival_time": "2024-05-17T17:30:00Z", "aircraft": "Boeing 737", "class": "premium_economy", "seat": "10A"}', 'AA567890123'),
(9, 'hotel', 'Sheraton', 280.00, '{"hotel_name": "Sheraton Las Vegas", "check_in": "2024-05-17", "check_out": "2024-05-20", "room_type": "Standard King", "amenities": ["Strip View", "Pool", "Casino"], "distance": "8 miles from venue"}', 'SHERATON123456'),
(9, 'ticket', 'EDC', 600.00, '{"ticket_type": "3-Day General Admission", "includes": ["Access to all stages", "Art cars", "Fireworks"]}', 'EDC123456'),
(9, 'transportation', 'Uber', 85.00, '{"service": "Uber Black", "pickup": "LAS Airport", "dropoff": "Las Vegas Motor Speedway", "estimated_time": "25 minutes"}', 'UBER456789'),

-- Trip 9: Sarah's Pearl Jam trip (Climate Pledge Arena)
(10, 'flight', 'Alaska Airlines', 0.00, '{"departure": "SEA", "arrival": "SEA", "flight_number": "AS1234", "departure_time": "2024-08-05T18:00:00Z", "arrival_time": "2024-08-05T18:30:00Z", "aircraft": "Boeing 737", "class": "economy", "seat": "5A", "note": "Local trip"}', 'AS123456789'),
(10, 'hotel', 'Marriott', 185.00, '{"hotel_name": "Marriott Seattle Downtown", "check_in": "2024-08-05", "check_out": "2024-08-06", "room_type": "Standard King", "amenities": ["City View", "Restaurant", "Fitness Center"], "distance": "0.4 miles from venue"}', 'MAR123456789'),
(10, 'ticket', 'Ticketmaster', 280.00, '{"section": "100", "row": "A", "seat": "5", "ticket_type": "Premium Seating"}', 'TM123456789'),
(10, 'transportation', 'Uber', 12.00, '{"service": "UberX", "pickup": "Marriott Downtown", "dropoff": "Climate Pledge Arena", "estimated_time": "3 minutes"}', 'UBER123456'),

-- Trip 10: Sarah's Bonnaroo trip
(11, 'flight', 'Delta Airlines', 380.00, '{"departure": "SEA", "arrival": "BNA", "flight_number": "DL5678", "departure_time": "2024-06-13T10:00:00Z", "arrival_time": "2024-06-13T18:30:00Z", "aircraft": "Boeing 737", "class": "economy", "seat": "12C"}', 'DL567890123'),
(11, 'hotel', 'Hyatt', 220.00, '{"hotel_name": "Hyatt Place Nashville", "check_in": "2024-06-13", "check_out": "2024-06-16", "room_type": "Standard King", "amenities": ["Free Breakfast", "Pool", "Fitness Center"], "distance": "45 miles from venue"}', 'HYATT567890'),
(11, 'ticket', 'Bonnaroo', 350.00, '{"ticket_type": "4-Day General Admission", "includes": ["Camping access", "All stages", "Food vendors"]}', 'BONNAROO123456'),
(11, 'transportation', 'Uber', 95.00, '{"service": "Uber XL", "pickup": "BNA Airport", "dropoff": "Great Stage Park", "estimated_time": "55 minutes"}', 'UBER567890'),

-- Trip 11: David's Willie Nelson trip (Moody Center)
(12, 'flight', 'Southwest Airlines', 0.00, '{"departure": "AUS", "arrival": "AUS", "flight_number": "WN9012", "departure_time": "2024-09-20T17:00:00Z", "arrival_time": "2024-09-20T17:30:00Z", "aircraft": "Boeing 737", "class": "economy", "seat": "8B", "note": "Local trip"}', 'WN901234567'),
(12, 'hotel', 'Hilton', 145.00, '{"hotel_name": "Hilton Austin", "check_in": "2024-09-20", "check_out": "2024-09-21", "room_type": "Standard King", "amenities": ["Downtown Location", "Restaurant", "Bar"], "distance": "0.8 miles from venue"}', 'HILTON901234'),
(12, 'ticket', 'Ticketmaster', 180.00, '{"section": "200", "row": "B", "seat": "10", "ticket_type": "General Admission"}', 'TM901234567'),
(12, 'transportation', 'Uber', 8.00, '{"service": "UberX", "pickup": "Hilton Austin", "dropoff": "Moody Center", "estimated_time": "4 minutes"}', 'UBER901234'),

-- Trip 12: David's ACL Festival trip
(13, 'flight', 'American Airlines', 0.00, '{"departure": "AUS", "arrival": "AUS", "flight_number": "AA3456", "departure_time": "2024-10-04T11:00:00Z", "arrival_time": "2024-10-04T11:15:00Z", "aircraft": "Boeing 737", "class": "economy", "seat": "15A", "note": "Local trip"}', 'AA345678901'),
(13, 'hotel', 'Marriott', 195.00, '{"hotel_name": "Marriott Austin Downtown", "check_in": "2024-10-04", "check_out": "2024-10-07", "room_type": "Deluxe King", "amenities": ["River View", "Restaurant", "Fitness Center"], "distance": "0.5 miles from venue"}', 'MAR345678901'),
(13, 'ticket', 'ACL Festival', 275.00, '{"ticket_type": "3-Day General Admission", "includes": ["Access to all stages", "Food vendors", "Art installations"]}', 'ACL345678901'),
(13, 'transportation', 'Uber', 12.00, '{"service": "UberX", "pickup": "Marriott Downtown", "dropoff": "Zilker Park", "estimated_time": "6 minutes"}', 'UBER345678901'); 