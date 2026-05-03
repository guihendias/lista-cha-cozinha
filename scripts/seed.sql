CREATE TABLE IF NOT EXISTS gifts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  reserved_by TEXT,
  reserved_at TIMESTAMP
);

INSERT INTO gifts (name, image_url, category) VALUES
  ('Jogo de Panelas Antiaderente', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop', 'Panelas'),
  ('Frigideira de Ferro Fundido', 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=300&fit=crop', 'Panelas'),
  ('Jogo de Facas Profissional', 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&h=300&fit=crop', 'Utensílios'),
  ('Jogo de Talheres 24 peças', 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=400&h=300&fit=crop', 'Utensílios'),
  ('Cafeteira Expresso', 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&h=300&fit=crop', 'Eletrodomésticos'),
  ('Air Fryer 5L', 'https://images.unsplash.com/photo-1648500661498-0b8c0eba3e32?w=400&h=300&fit=crop', 'Eletrodomésticos'),
  ('Liquidificador', 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&h=300&fit=crop', 'Eletrodomésticos'),
  ('Jogo de Taças de Vinho', 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400&h=300&fit=crop', 'Mesa & Bar'),
  ('Aparelho de Jantar 20 peças', 'https://images.unsplash.com/photo-1603199506016-5d54af511ee7?w=400&h=300&fit=crop', 'Mesa & Bar'),
  ('Jogo Americano (6 unidades)', 'https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=400&h=300&fit=crop', 'Mesa & Bar');
