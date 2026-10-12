-- OFFPRINT (অফপ্রিন্ট) - SEED DATA
-- Insert Portfolio Projects
INSERT INTO portfolio_projects (title, client_name, category, is_flagship, thumbnail_url, gallery_urls, video_url, completed_date)
VALUES
(
  'Bangladesh Tech Leaders Summit 2025',
  'Dhaka Chamber of IT Leaders',
  'corporate_summit',
  true,
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80'
  ],
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  '2025-11-15'
),
(
  'Heritage Weaves: The Jamdani Documentary',
  'Aarong Craft Archive',
  'documentary',
  true,
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=1200&q=80'
  ],
  null,
  '2025-10-20'
),
(
  'C-Suite Executive Portraits',
  'Apex Fintech Advisory',
  'headshot',
  true,
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80'
  ],
  null,
  '2026-01-10'
),
(
  'Sustainable Textiles Innovation Forum',
  'BGMEA Sustainability Wing',
  'workshop',
  false,
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
  ],
  null,
  '2025-12-04'
),
(
  'The Royal Crimson Wedding Story',
  'The Chowdhury & Rahman Family',
  'wedding',
  true,
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80'
  ],
  null,
  '2026-02-14'
),
(
  'Modern Gastronomy: Chef Table Series',
  'Ouzo Fine Dining Gulshan',
  'documentary',
  false,
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80'
  ],
  null,
  '2025-09-28'
);

-- Insert Print Products
INSERT INTO print_products (title, category, material_specs, image_url, gallery_urls, min_order_qty, is_trending)
VALUES
(
  'Luxury Blind Debossed Matte Cards',
  'cards',
  '650 GSM Cotton Uncoated Stock • Deep Espresso Blind Deboss • Bronze Foil Edge Gilding',
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80'
  ],
  100,
  true
),
(
  'Executive Floating Acrylic Awards Frame',
  'frames',
  '12mm Optical Clear Cast Acrylic • Brushed Brass Standoffs • UV Archival Backing',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80'
  ],
  10,
  true
),
(
  'Bespoke Corporate Swag Gift Suite',
  'corporate_swag',
  'Hardcover PU Leather Foil Journal • Thermal Matte Flask • Linen Gift Box with Custom Foam Inset',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80'
  ],
  25,
  true
),
(
  'Laser Engraved Executive Brass Pen',
  'pens',
  'Solid Anodized Heavy Metal Body • German Rollerball 0.7mm Ink • Precision Fiber Laser Monogram',
  'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1000&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1000&q=80'
  ],
  50,
  false
),
(
  'Retractable Matte Black Summit Banner',
  'banners',
  'Heavyweight Aluminum Base • Anti-Curl Blockout Canvas • High Density Eco-Solvent 1440 DPI Print',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80'
  ],
  2,
  false
);

-- Insert Sample Leads
INSERT INTO leads (client_name, company_name, email, phone, inquiry_type, details, estimated_qty, event_date, status, admin_notes)
VALUES
(
  'Tanvir Ahmed',
  'Beximco Innovations',
  'tanvir.a@bexinnovations.com',
  '+8801711223344',
  'event_coverage',
  'Annual Global Partner Summit at Radisson Blu Dhaka. Need 3 multicam videographers, 4K executive keynote highlights, and instantaneous same-day PR photo delivery.',
  '2 Days (Approx 400 attendees)',
  '2026-11-20',
  'new',
  'Initial inquiry received via web portal. High priority corporate client.'
),
(
  'Sabrina Khan',
  'Loom & Weave Bangladesh',
  'sabrina@loomandweave.com.bd',
  '+8801819556677',
  'physical_merch',
  'Looking for 250 bespoke executive swag kits including custom embossed leather planners and laser engraved pens for overseas retail buyers.',
  '250 kits',
  null,
  'quote_sent',
  'Quotation draft #OFP-2026-88 sent to Sabrina. Follow up scheduled on Thursday.'
),
(
  'Farhan Chowdhury',
  'Chowdhury Holdings',
  'farhan@chowdhury.com',
  '+8801912345678',
  'event_coverage',
  'Executive wedding media coverage in Dhaka Army Golf Club. 3-day festivities.',
  '3 Days',
  '2026-12-15',
  'contacted',
  'Called Farhan. Requested formal quotation breakdown for cinematic crew + drone license.'
);
